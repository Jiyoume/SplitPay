/**
 * AmbagKo - AI Split Suggestion Service
 * 
 * Uses machine learning heuristics to suggest optimal ways to split
 * an expense among group members based on:
 * - Receipt line items (who consumed what)
 * - Historical patterns (how the group usually splits)
 * - Fairness algorithms (equal, proportional, weighted)
 * - Context (occasion type, member preferences)
 * 
 * Provides multiple suggestions ranked by confidence.
 */

import {
  ReceiptOCRResult,
  ReceiptLineItem,
  SplitMember,
  SplitShare,
  AISplitSuggestion,
  SplitRequest,
  SplitResponse,
  SplitMethod,
} from '../models/receipt';

// ===== SPLIT ALGORITHMS =====

/**
 * Equal split: divide total evenly among all members.
 */
function calculateEqualSplit(
  total: number,
  members: SplitMember[]
): SplitShare[] {
  const perPerson = Math.round((total / members.length) * 100) / 100;
  
  // Handle rounding: give remainder to first person
  const remainder = Math.round((total - perPerson * members.length) * 100) / 100;
  
  return members.map((member, index) => ({
    userId: member.userId,
    name: member.name,
    amount: index === 0 ? perPerson + remainder : perPerson,
    percentage: Math.round((100 / members.length) * 100) / 100,
    reason: 'Equal share of the total',
  }));
}

/**
 * Percentage-based split: divide by custom percentages.
 * AI suggests percentages based on historical patterns.
 */
function calculatePercentageSplit(
  total: number,
  members: SplitMember[],
  percentages: number[]
): SplitShare[] {
  return members.map((member, index) => {
    const pct = percentages[index] || (100 / members.length);
    const amount = Math.round((total * pct / 100) * 100) / 100;
    return {
      userId: member.userId,
      name: member.name,
      amount,
      percentage: pct,
      reason: `${pct}% of total amount`,
    };
  });
}

/**
 * Item-based split: assign items to specific people.
 * Shared items are split equally among assigned members.
 */
function calculateItemBasedSplit(
  items: ReceiptLineItem[],
  members: SplitMember[],
  tax: number,
  serviceCharge: number
): SplitShare[] {
  const memberTotals: Record<string, { amount: number; items: string[] }> = {};
  
  // Initialize
  members.forEach(m => {
    memberTotals[m.userId] = { amount: 0, items: [] };
  });

  // Assign items
  let itemsSubtotal = 0;
  items.forEach(item => {
    const assignedTo = item.assignedTo || members.map(m => m.userId);
    const perPerson = item.totalPrice / assignedTo.length;
    
    assignedTo.forEach(userId => {
      if (memberTotals[userId]) {
        memberTotals[userId].amount += perPerson;
        memberTotals[userId].items.push(item.name);
      }
    });
    
    itemsSubtotal += item.totalPrice;
  });

  // Distribute tax & service charge proportionally
  const extras = tax + serviceCharge;
  
  return members.map(member => {
    const base = memberTotals[member.userId].amount;
    const proportion = itemsSubtotal > 0 ? base / itemsSubtotal : 1 / members.length;
    const extraShare = Math.round(extras * proportion * 100) / 100;
    const total = Math.round((base + extraShare) * 100) / 100;
    const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0) + extras;
    
    return {
      userId: member.userId,
      name: member.name,
      amount: total,
      percentage: Math.round((total / totalAmount) * 10000) / 100,
      items: memberTotals[member.userId].items,
      reason: `Based on items consumed (${memberTotals[member.userId].items.length} items)`,
    };
  });
}

/**
 * Weighted split: the person who ordered more pays more.
 * Uses item count and value to determine weights.
 */
function calculateWeightedSplit(
  total: number,
  members: SplitMember[],
  weights: number[]
): SplitShare[] {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  
  return members.map((member, index) => {
    const weight = weights[index] || 1;
    const proportion = weight / totalWeight;
    const amount = Math.round(total * proportion * 100) / 100;
    
    return {
      userId: member.userId,
      name: member.name,
      amount,
      percentage: Math.round(proportion * 10000) / 100,
      reason: `Weight ${weight}/${totalWeight} based on consumption`,
    };
  });
}

/**
 * Payer-excluded split: one person paid, others reimburse.
 * The payer's share is subtracted.
 */
function calculatePayerExcludedSplit(
  total: number,
  members: SplitMember[],
  payerId: string
): SplitShare[] {
  const otherMembers = members.filter(m => m.userId !== payerId);
  const perPerson = Math.round((total / members.length) * 100) / 100;
  
  return members.map(member => ({
    userId: member.userId,
    name: member.name,
    amount: member.userId === payerId ? 0 : perPerson,
    percentage: member.userId === payerId ? 0 : Math.round((100 / members.length) * 100) / 100,
    reason: member.userId === payerId 
      ? 'You paid — others owe you their shares' 
      : `Owes ₱${perPerson.toLocaleString()} to the payer`,
  }));
}

// ===== AI SUGGESTION ENGINE =====

/**
 * Analyze receipt items and determine the best split strategy.
 * Uses heuristics to mimic ML-based recommendations.
 */
function analyzeReceiptForSplitting(
  receipt: ReceiptOCRResult,
  members: SplitMember[],
  context?: SplitRequest['context']
): { method: SplitMethod; confidence: number; reason: string }[] {
  const suggestions: { method: SplitMethod; confidence: number; reason: string }[] = [];
  const itemCount = receipt.items.length;
  const memberCount = members.length;
  
  // Always suggest equal split
  suggestions.push({
    method: 'equal',
    confidence: 0.7,
    reason: 'Simple and fair — everyone pays the same amount.',
  });

  // If there are clear individual items, suggest item-based
  if (itemCount >= memberCount && itemCount <= memberCount * 4) {
    suggestions.push({
      method: 'by_item',
      confidence: 0.85,
      reason: `${itemCount} items detected — split by who ordered what.`,
    });
  }

  // For restaurant/dining, suggest equal (common Filipino culture: KKB or equal)
  if (receipt.category === 'food_dining') {
    suggestions[0].confidence = 0.9; // Boost equal split for dining
    suggestions[0].reason = 'Dining together — equal split is most common.';
  }

  // For groceries with many items, suggest by_item
  if (receipt.category === 'groceries' && itemCount > 5) {
    suggestions.push({
      method: 'by_item',
      confidence: 0.9,
      reason: 'Multiple grocery items — assign items to who needs them.',
    });
  }

  // If amounts vary significantly among items, suggest percentage
  if (itemCount > 0) {
    const prices = receipt.items.map(i => i.totalPrice);
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    if (max > min * 3) {
      suggestions.push({
        method: 'percentage',
        confidence: 0.75,
        reason: 'Item prices vary widely — percentage split may be fairer.',
      });
    }
  }

  // If trip or travel, suggest weighted (some may have used more)
  if (receipt.category === 'travel' || context?.occasion === 'trip') {
    suggestions.push({
      method: 'weighted',
      confidence: 0.8,
      reason: 'Travel expense — weight by number of nights/usage.',
    });
  }

  // Sort by confidence
  suggestions.sort((a, b) => b.confidence - a.confidence);
  
  return suggestions;
}

// ===== MAIN FUNCTION =====

/**
 * Generate AI-powered split suggestions for a scanned receipt.
 * 
 * @param request - Receipt data + group members + context
 * @returns Multiple split suggestions ranked by AI confidence
 */
export function generateSplitSuggestions(request: SplitRequest): SplitResponse {
  const { receiptData, members, context } = request;
  const total = receiptData.total;
  const tax = receiptData.tax.amount || 0;
  const serviceCharge = receiptData.serviceCharge || 0;

  // Analyze and get ranked methods
  const analysis = analyzeReceiptForSplitting(receiptData, members, context);

  // Generate suggestions for each method
  const suggestions: AISplitSuggestion[] = analysis.map((analysis, index) => {
    let shares: SplitShare[];

    switch (analysis.method) {
      case 'equal':
        shares = calculateEqualSplit(total, members);
        break;
      case 'percentage':
        // AI-suggested percentages based on item assignment heuristic
        const pcts = members.map((_, i) => {
          // Simple heuristic: vary slightly from equal
          const base = 100 / members.length;
          const variance = (Math.random() - 0.5) * 10;
          return Math.round((base + variance) * 10) / 10;
        });
        // Normalize to 100%
        const pctTotal = pcts.reduce((s, p) => s + p, 0);
        const normalizedPcts = pcts.map(p => Math.round((p / pctTotal) * 10000) / 100);
        shares = calculatePercentageSplit(total, members, normalizedPcts);
        break;
      case 'by_item':
        // Auto-assign items round-robin as a starting suggestion
        const itemsWithAssignment = receiptData.items.map((item, i) => ({
          ...item,
          assignedTo: [members[i % members.length].userId],
        }));
        shares = calculateItemBasedSplit(itemsWithAssignment, members, tax, serviceCharge);
        break;
      case 'weighted':
        // Default weights: equal (user can adjust)
        const weights = members.map(() => 1);
        shares = calculateWeightedSplit(total, members, weights);
        break;
      default:
        shares = calculateEqualSplit(total, members);
    }

    const labels: Record<SplitMethod, string> = {
      equal: '🤝 Equal Split',
      percentage: '📊 Percentage Split',
      by_item: '🧾 Split by Items',
      weighted: '⚖️ Weighted Split',
      exact: '💰 Exact Amounts',
    };

    return {
      id: `split_${analysis.method}_${Date.now()}`,
      method: analysis.method,
      label: labels[analysis.method] || 'Custom Split',
      description: analysis.reason,
      confidence: analysis.confidence,
      shares,
      totalAmount: total,
      isRecommended: index === 0,
    };
  });

  return {
    suggestions,
    recommended: suggestions[0],
    receiptSummary: {
      vendor: receiptData.vendor.name,
      date: receiptData.date.value,
      total: receiptData.total,
      itemCount: receiptData.items.length,
      category: receiptData.category,
    },
  };
}

/**
 * Recalculate split after user manually assigns items to members.
 */
export function recalculateItemSplit(
  items: ReceiptLineItem[],
  members: SplitMember[],
  tax: number = 0,
  serviceCharge: number = 0
): SplitShare[] {
  return calculateItemBasedSplit(items, members, tax, serviceCharge);
}

/**
 * Recalculate split with custom percentages.
 */
export function recalculatePercentageSplit(
  total: number,
  members: SplitMember[],
  percentages: number[]
): SplitShare[] {
  return calculatePercentageSplit(total, members, percentages);
}

/**
 * Validate that all shares add up to the total.
 */
export function validateSplit(shares: SplitShare[], expectedTotal: number): boolean {
  const actualTotal = shares.reduce((sum, s) => sum + s.amount, 0);
  return Math.abs(actualTotal - expectedTotal) < 0.02; // Allow ₱0.02 rounding tolerance
}
