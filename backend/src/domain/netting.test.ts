/**
 * Required unit test (ARCHITECTURE §5.7 / §9 M5-M6): "settle -> 0" netting.
 * Run with: npm test (tsx src/domain/netting.test.ts). No test framework dependency — plain
 * assertions, non-zero exit on failure so it's CI/demo-machine friendly.
 */

import assert from "node:assert/strict";
import { calculateBalances } from "./splitCalculator.js";
import { applySettlements } from "./netting.js";
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

console.log("domain/netting.test.ts");

test("expense creates a debt -> full settlement zeroes that balance pair", () => {
  const D = "u_debtor";
  const C = "u_creditor";
  const memberIds = [D, C];

  // 2 members, one $50 expense split equally (each owes $25). C paid, D owes C $25.
  const expenses: Expense[] = [
    {
      id: "e1",
      groupId: "g1",
      description: "Dinner",
      amount: 50,
      currency: "USD",
      category: "food",
      paidBy: C,
      splitMethod: "equal",
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      splits: [
        { userId: D, amount: 25, isPaid: false },
        { userId: C, amount: 25, isPaid: false },
      ],
    },
  ];

  const rawBalances = calculateBalances(expenses, memberIds);

  // Sanity: before settlement, D owes C $25 and nets are +-25.
  const rawD = rawBalances.find((b) => b.userId === D)!;
  const rawC = rawBalances.find((b) => b.userId === C)!;
  assert.equal(rawD.netBalance, -25);
  assert.equal(rawC.netBalance, 25);
  assert.equal(rawD.owes.length, 1);
  assert.equal(rawD.owes[0].amount, 25);
  assert.equal(rawC.isOwed.length, 1);
  assert.equal(rawC.isOwed[0].amount, 25);

  // A settled settlement D -> C of $25 (the full outstanding debt).
  const netted = applySettlements(rawBalances, [
    { fromUserId: D, toUserId: C, amount: 25, status: "settled" },
  ]);

  const nettedD = netted.find((b) => b.userId === D)!;
  const nettedC = netted.find((b) => b.userId === C)!;

  // The pair has NO owes/isOwed entry left, and both nets are exactly 0.
  assert.equal(nettedD.owes.length, 0, "debtor should have no remaining owes entry");
  assert.equal(nettedC.isOwed.length, 0, "creditor should have no remaining isOwed entry");
  assert.equal(nettedD.netBalance, 0, "debtor netBalance must be exactly 0");
  assert.equal(nettedC.netBalance, 0, "creditor netBalance must be exactly 0");
});

test("a pending (not yet settled) settlement does NOT net", () => {
  const D = "u_debtor2";
  const C = "u_creditor2";
  const balances = calculateBalances(
    [
      {
        id: "e2",
        groupId: "g1",
        description: "Rent",
        amount: 100,
        currency: "USD",
        category: "rent",
        paidBy: C,
        splitMethod: "equal",
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        splits: [
          { userId: D, amount: 50, isPaid: false },
          { userId: C, amount: 50, isPaid: false },
        ],
      },
    ],
    [D, C]
  );

  const netted = applySettlements(balances, [
    { fromUserId: D, toUserId: C, amount: 50, status: "pending" },
  ]);

  const nettedD = netted.find((b) => b.userId === D)!;
  assert.equal(nettedD.netBalance, -50, "pending settlements must not affect balances");
  assert.equal(nettedD.owes.length, 1);
});

test("a partial settlement reduces but does not zero the pair", () => {
  const D = "u_debtor3";
  const C = "u_creditor3";
  const balances = calculateBalances(
    [
      {
        id: "e3",
        groupId: "g1",
        description: "Utilities",
        amount: 80,
        currency: "USD",
        category: "utilities",
        paidBy: C,
        splitMethod: "equal",
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        splits: [
          { userId: D, amount: 40, isPaid: false },
          { userId: C, amount: 40, isPaid: false },
        ],
      },
    ],
    [D, C]
  );

  const netted = applySettlements(balances, [
    { fromUserId: D, toUserId: C, amount: 15, status: "settled" },
  ]);

  const nettedD = netted.find((b) => b.userId === D)!;
  assert.equal(nettedD.netBalance, -25);
  assert.equal(nettedD.owes[0].amount, 25);
});

console.log(`\n${passed}/3 tests passed`);
if (process.exitCode === 1) {
  console.error("\nnetting tests FAILED");
} else {
  console.log("\nall netting tests passed");
}
