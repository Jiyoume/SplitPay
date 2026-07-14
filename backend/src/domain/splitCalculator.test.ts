/**
 * Unit tests for splitCalculator (ARCHITECTURE §8.5, DECISIONS §3.5).
 * Pure domain logic, no I/O. Tests all split methods and rounding behavior.
 * Run: npm test (via package.json or tsx src/domain/splitCalculator.test.ts)
 */

import assert from "node:assert/strict";
import { calculateEqualSplit, calculateBalances, simplifyDebts } from "./splitCalculator.js";
import type { Expense } from "./types.js";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok - ${name}`);
  } catch (err) {
    console.error(`  FAIL - ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log("domain/splitCalculator.test.ts");

// ============ calculateEqualSplit ============
test("equal split: two members, $100", () => {
  const splits = calculateEqualSplit(100, ["u1", "u2"]);
  assert.equal(splits.length, 2);
  assert.equal(splits[0].amount, 50);
  assert.equal(splits[1].amount, 50);
  assert.equal(splits[0].isPaid, false);
  assert.equal(splits[1].isPaid, false);
});

test("equal split: three members, $100 (rounding: 33.33 x 3 = 99.99)", () => {
  const splits = calculateEqualSplit(100, ["u1", "u2", "u3"]);
  assert.equal(splits.length, 3);
  assert.equal(splits[0].amount, 33.33);
  assert.equal(splits[1].amount, 33.33);
  assert.equal(splits[2].amount, 33.33);
  const sum = splits.reduce((s, sp) => s + sp.amount, 0);
  assert.equal(Math.round(sum * 100), 9999); // 99.99
});

test("equal split: four members, $10 (rounding: 2.5 each)", () => {
  const splits = calculateEqualSplit(10, ["u1", "u2", "u3", "u4"]);
  splits.forEach((s) => {
    assert.equal(s.amount, 2.5);
  });
});

test("equal split: single member", () => {
  const splits = calculateEqualSplit(100, ["u1"]);
  assert.equal(splits.length, 1);
  assert.equal(splits[0].amount, 100);
});

// ============ calculateBalances ============
test("balances: simple two-person debt", () => {
  const expenses: Expense[] = [
    {
      id: "e1",
      groupId: "g1",
      description: "Dinner",
      amount: 100,
      currency: "USD",
      category: "food",
      paidBy: "creditor",
      splitMethod: "equal",
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      splits: [
        { userId: "debtor", amount: 50, isPaid: false },
        { userId: "creditor", amount: 50, isPaid: false },
      ],
    },
  ];

  const balances = calculateBalances(expenses, ["debtor", "creditor"]);
  const debtor = balances.find((b) => b.userId === "debtor")!;
  const creditor = balances.find((b) => b.userId === "creditor")!;

  assert.equal(debtor.netBalance, -50);
  assert.equal(creditor.netBalance, 50);
  assert.equal(debtor.owes.length, 1);
  assert.equal(debtor.owes[0].toUserId, "creditor");
  assert.equal(debtor.owes[0].amount, 50);
  assert.equal(creditor.isOwed.length, 1);
  assert.equal(creditor.isOwed[0].fromUserId, "debtor");
});

test("balances: multiple expenses, complex debt chains", () => {
  const expenses: Expense[] = [
    {
      id: "e1",
      groupId: "g1",
      description: "Lunch",
      amount: 60,
      currency: "USD",
      category: "food",
      paidBy: "alice",
      splitMethod: "equal",
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      splits: [
        { userId: "alice", amount: 20, isPaid: false },
        { userId: "bob", amount: 20, isPaid: false },
        { userId: "charlie", amount: 20, isPaid: false },
      ],
    },
    {
      id: "e2",
      groupId: "g1",
      description: "Rent",
      amount: 300,
      currency: "USD",
      category: "rent",
      paidBy: "bob",
      splitMethod: "equal",
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      splits: [
        { userId: "alice", amount: 100, isPaid: false },
        { userId: "bob", amount: 100, isPaid: false },
        { userId: "charlie", amount: 100, isPaid: false },
      ],
    },
  ];

  const balances = calculateBalances(expenses, ["alice", "bob", "charlie"]);
  const alice = balances.find((b) => b.userId === "alice")!;
  const bob = balances.find((b) => b.userId === "bob")!;
  const charlie = balances.find((b) => b.userId === "charlie")!;

  // alice: owes bob 100 (rent), owed by bob 20 + charlie 20 (lunch) = 40; netBalance = 40 - 100 = -60
  assert.equal(alice.netBalance, -60);
  assert.equal(alice.owes.length, 1);
  assert.equal(alice.isOwed.length, 2);

  // bob: owed by alice 100 + charlie 100 (rent) = 200, owes alice 20 (lunch); netBalance = 200 - 20 = 180
  assert.equal(bob.netBalance, 180);
  assert.equal(bob.isOwed.length, 2);
  assert.equal(bob.owes.length, 1);

  // charlie: owes alice 20 + bob 100 = -120; netBalance = -120
  assert.equal(charlie.netBalance, -120);
  assert.equal(charlie.isOwed.length, 0);
  assert.equal(charlie.owes.length, 2);

  // Sanity: sum of net balances = 0
  const sum = alice.netBalance + bob.netBalance + charlie.netBalance;
  assert.equal(sum, 0);
});

test("balances: no expenses", () => {
  const balances = calculateBalances([], ["u1", "u2"]);
  balances.forEach((b) => {
    assert.equal(b.netBalance, 0);
    assert.equal(b.owes.length, 0);
    assert.equal(b.isOwed.length, 0);
  });
});

test("balances: someone not in splits is excluded from debts", () => {
  const expenses: Expense[] = [
    {
      id: "e1",
      groupId: "g1",
      description: "Dinner",
      amount: 100,
      currency: "USD",
      category: "food",
      paidBy: "alice",
      splitMethod: "exact",
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      splits: [
        { userId: "bob", amount: 100, isPaid: false },
        // charlie is a group member but not in this split
      ],
    },
  ];

  const balances = calculateBalances(expenses, ["alice", "bob", "charlie"]);
  const charlie = balances.find((b) => b.userId === "charlie")!;

  assert.equal(charlie.netBalance, 0);
  assert.equal(charlie.owes.length, 0);
  assert.equal(charlie.isOwed.length, 0);
});

// ============ simplifyDebts ============
test("simplifyDebts: simple two-person", () => {
  const balances = [
    { userId: "u1", owes: [{ toUserId: "u2", amount: 50 }], isOwed: [], netBalance: -50 },
    { userId: "u2", owes: [], isOwed: [{ fromUserId: "u1", amount: 50 }], netBalance: 50 },
  ];

  const suggestions = simplifyDebts(balances);
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].from, "u1");
  assert.equal(suggestions[0].to, "u2");
  assert.equal(suggestions[0].amount, 50);
});

test("simplifyDebts: circular debt (minimum transfers)", () => {
  // alice owes 100, bob owes 50, charlie is owed 150
  // simplified: alice -> charlie (100), bob -> charlie (50)
  const balances = [
    { userId: "alice", owes: [], isOwed: [], netBalance: -100 },
    { userId: "bob", owes: [], isOwed: [], netBalance: -50 },
    { userId: "charlie", owes: [], isOwed: [], netBalance: 150 },
  ];

  const suggestions = simplifyDebts(balances);
  assert.equal(suggestions.length, 2);
  const totalAmount = suggestions.reduce((s, t) => s + t.amount, 0);
  assert.equal(totalAmount, 150);
});

test("simplifyDebts: no debts (all zero)", () => {
  const balances = [
    { userId: "u1", owes: [], isOwed: [], netBalance: 0 },
    { userId: "u2", owes: [], isOwed: [], netBalance: 0 },
  ];

  const suggestions = simplifyDebts(balances);
  assert.equal(suggestions.length, 0);
});

test("simplifyDebts: never self-pays", () => {
  const balances = [
    { userId: "u1", owes: [], isOwed: [], netBalance: -50 },
    { userId: "u2", owes: [], isOwed: [], netBalance: 50 },
  ];

  const suggestions = simplifyDebts(balances);
  suggestions.forEach((s) => {
    assert.notEqual(s.from, s.to, "no self-pays");
  });
});

test("simplifyDebts: amounts are positive and reconcile to balances", () => {
  const balances = [
    { userId: "u1", owes: [], isOwed: [], netBalance: -200 },
    { userId: "u2", owes: [], isOwed: [], netBalance: 100 },
    { userId: "u3", owes: [], isOwed: [], netBalance: 100 },
  ];

  const suggestions = simplifyDebts(balances);
  suggestions.forEach((s) => {
    assert(s.amount > 0, "all suggestion amounts must be positive");
  });

  const totalDebtFromU1 = suggestions
    .filter((s) => s.from === "u1")
    .reduce((sum, s) => sum + s.amount, 0);
  assert.equal(totalDebtFromU1, 200);
});

console.log(`\n${passed}/${passed} tests passed`);
if (process.exitCode === 1) {
  console.error("\nsplitCalculator tests FAILED");
} else {
  console.log("\nall splitCalculator tests passed");
}
