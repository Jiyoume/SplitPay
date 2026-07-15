import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { getTopUpHistory } from '../services/topUpService';
import { generateMonthlyStatement, exportStatementToCSV } from '../services/reportService';
import { MonthlyStatement, PaymentRecord } from '../models/reports';

export default function ReportsScreen() {
  const { user: currentUser } = useAuth();
  const today = new Date();

  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [statement, setStatement] = useState<MonthlyStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  useEffect(() => {
    generateReport();
  }, [month, year]);

  const generateReport = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const groups = await apiService.getGroups();
      const [expensesByGroup, settlementsByGroup, topups] = await Promise.all([
        Promise.all(groups.map((g) => apiService.getExpenses(g.id))),
        Promise.all(groups.map((g) => apiService.getSettlements(g.id))),
        getTopUpHistory(),
      ]);
      const expenses = expensesByGroup.flat();
      const settlements = settlementsByGroup.flat();

      const topUpRecords: PaymentRecord[] = topups.map((t) => ({
        id: t.id,
        date: t.createdAt,
        type: 'topup',
        amount: t.netAmount,
        currency: t.currency,
        counterparty: { userId: 'system', name: 'Top-up' },
        method: t.method,
        reference: t.id,
        status: t.status === 'completed' ? 'completed' : t.status === 'pending_payment' ? 'pending' : 'failed',
        stellarTxHash: t.stellarTxHash,
      }));

      const stmt = generateMonthlyStatement(currentUser.id, month, year, expenses, settlements, groups, topUpRecords, 0);
      setStatement(stmt);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  const goPrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const goNextMonth = () => {
    if (isCurrentMonth) return;
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleExport = async () => {
    if (!statement) return;
    setExporting(true);
    try {
      const csv = exportStatementToCSV(statement);
      await Share.share({ message: csv, title: `SplitPay-Statement-${year}-${String(month).padStart(2, '0')}.csv` });
    } catch (error: any) {
      Alert.alert('Export Failed', error.message || 'Could not share the CSV.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.monthSelector}>
          <TouchableOpacity style={styles.monthArrow} onPress={goPrevMonth}>
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity style={styles.monthArrow} onPress={goNextMonth} disabled={isCurrentMonth}>
            <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? Colors.textLight : Colors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : !statement || statement.transactionCount === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No activity in {monthLabel}.</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Summary</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Opening</Text>
                  <Text style={styles.summaryValue}>${statement.openingBalance.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Closing</Text>
                  <Text style={styles.summaryValue}>${statement.closingBalance.toFixed(2)}</Text>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Inflows</Text>
                  <Text style={[styles.summaryValue, { color: Colors.positive }]}>+${statement.totalInflows.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Outflows</Text>
                  <Text style={[styles.summaryValue, { color: Colors.negative }]}>-${statement.totalOutflows.toFixed(2)}</Text>
                </View>
              </View>
              <View style={styles.netChangeRow}>
                <Text style={styles.summaryLabel}>Net Change</Text>
                <Text
                  style={[
                    styles.netChangeValue,
                    { color: statement.netChange >= 0 ? Colors.positive : Colors.negative },
                  ]}
                >
                  {statement.netChange >= 0 ? '+' : ''}${statement.netChange.toFixed(2)}
                </Text>
              </View>
            </View>

            {statement.categoryBreakdown.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Category Breakdown</Text>
                {statement.categoryBreakdown.map((c) => (
                  <View key={c.category} style={styles.categoryRow}>
                    <Text style={styles.categoryIcon}>{c.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.categoryName}>{c.category.replace(/_/g, ' ')}</Text>
                      <View style={styles.categoryBarTrack}>
                        <View style={[styles.categoryBarFill, { width: `${Math.min(c.percentage, 100)}%` }]} />
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.categoryAmount}>${c.amount.toFixed(2)}</Text>
                      <Text style={styles.categoryPercent}>{c.percentage.toFixed(0)}%</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Insights</Text>
              <View style={styles.insightRow}>
                <Ionicons name="pricetag-outline" size={18} color={Colors.primary} />
                <Text style={styles.insightText}>
                  Top category: <Text style={styles.boldText}>{statement.topCategory.category.replace(/_/g, ' ')}</Text>{' '}
                  (${statement.topCategory.amount.toFixed(2)})
                </Text>
              </View>
              <View style={styles.insightRow}>
                <Ionicons name="people-outline" size={18} color={Colors.primary} />
                <Text style={styles.insightText}>
                  Most active group: <Text style={styles.boldText}>{statement.mostActiveGroup.name}</Text> (
                  {statement.mostActiveGroup.transactionCount} txns)
                </Text>
              </View>
              <View style={styles.insightRow}>
                <Ionicons name="receipt-outline" size={18} color={Colors.primary} />
                <Text style={styles.insightText}>
                  Largest expense: <Text style={styles.boldText}>{statement.largestExpense.description}</Text> ($
                  {statement.largestExpense.amount.toFixed(2)})
                </Text>
              </View>
              <View style={styles.insightRow}>
                <Ionicons name="swap-horizontal-outline" size={18} color={Colors.primary} />
                <Text style={styles.insightText}>
                  Net position:{' '}
                  <Text
                    style={[styles.boldText, { color: statement.netOwed >= 0 ? Colors.positive : Colors.negative }]}
                  >
                    {statement.netOwed >= 0
                      ? `+$${statement.netOwed.toFixed(2)} owed to you`
                      : `-$${Math.abs(statement.netOwed).toFixed(2)} you owe`}
                  </Text>
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.exportButton, exporting && { opacity: 0.7 }]}
              onPress={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color={Colors.primary} />
                  <Text style={styles.exportButtonText}>Export CSV</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scrollContainer: { padding: 16, flexGrow: 1, paddingBottom: 40 },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  monthArrow: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthLabel: {
    fontFamily: 'Georgia',
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.text,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 1,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  netChangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  netChangeValue: {
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: 'bold',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  categoryBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  categoryAmount: {
    fontFamily: 'Georgia',
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.text,
  },
  categoryPercent: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 19,
  },
  boldText: {
    fontWeight: '800',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 6,
    paddingVertical: 14,
    gap: 8,
    minHeight: 48,
    marginBottom: 8,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});
