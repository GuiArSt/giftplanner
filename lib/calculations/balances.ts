/**
 * Balance calculation logic for gift-based expense tracking
 *
 * This calculates who owes what to whom based on:
 * 1. Each gift has a target amount and contributors
 * 2. Each contributor has an allotment (custom or equal split)
 * 3. Expenses are payments toward a gift
 * 4. If someone pays more than their allotment → others owe them
 * 5. If someone pays less than their allotment → they owe others
 */

export interface ExpenseContributor {
  user_id: string
  amount_paid: number
}

export interface GiftContributor {
  user_id: string
  allotment: number | null // null means equal split
}

export interface Expense {
  id: string
  gift_id: string
  amount: number
  contributors: ExpenseContributor[]
}

export interface Gift {
  id: string
  amount: number // target amount for the gift
  contributors: GiftContributor[]
}

export interface Balance {
  from_user_id: string
  to_user_id: string
  amount: number
}

/**
 * Calculate balances across all gifts
 *
 * Algorithm:
 * 1. For each gift, determine each contributor's allotment
 * 2. For each gift, sum up what each person actually paid (from expenses)
 * 3. Calculate net balance: (amount_paid - allotment) for each user per gift
 * 4. Aggregate across all gifts
 * 5. Generate settlement suggestions to minimize transactions
 */
export function calculateBalances(gifts: Gift[], expenses: Expense[]): Balance[] {
  // Track net balance for each user across all gifts
  const netBalances = new Map<string, number>()

  // Process each gift
  gifts.forEach(gift => {
    const giftAmount = gift.amount
    const contributorCount = gift.contributors.length

    if (contributorCount === 0) return

    // Calculate what each person should pay (allotment)
    const allotments = new Map<string, number>()
    let totalCustomAllotment = 0
    let contributorsWithoutCustom = 0

    gift.contributors.forEach(contributor => {
      if (contributor.allotment !== null) {
        allotments.set(contributor.user_id, contributor.allotment)
        totalCustomAllotment += contributor.allotment
      } else {
        contributorsWithoutCustom++
      }
    })

    // For contributors without custom allotment, split remaining equally
    const remainingAmount = giftAmount - totalCustomAllotment
    const equalSplitAmount = contributorsWithoutCustom > 0
      ? remainingAmount / contributorsWithoutCustom
      : 0

    gift.contributors.forEach(contributor => {
      if (contributor.allotment === null) {
        allotments.set(contributor.user_id, equalSplitAmount)
      }
    })

    // Calculate what each person actually paid for this gift
    const actualPayments = new Map<string, number>()

    // Initialize all contributors with 0 payments
    gift.contributors.forEach(contributor => {
      actualPayments.set(contributor.user_id, 0)
    })

    // Sum up expenses for this gift
    const giftExpenses = expenses.filter(e => e.gift_id === gift.id)
    giftExpenses.forEach(expense => {
      expense.contributors.forEach(contributor => {
        const currentPaid = actualPayments.get(contributor.user_id) || 0
        actualPayments.set(contributor.user_id, currentPaid + contributor.amount_paid)
      })
    })

    // Calculate net balance for this gift: paid - owed
    gift.contributors.forEach(contributor => {
      const userId = contributor.user_id
      const allotment = allotments.get(userId) || 0
      const paid = actualPayments.get(userId) || 0
      const netForGift = paid - allotment

      const currentBalance = netBalances.get(userId) || 0
      netBalances.set(userId, currentBalance + netForGift)
    })
  })

  // Generate settlement transactions
  const balances: Balance[] = []
  const creditors: Array<{ userId: string; amount: number }> = []
  const debtors: Array<{ userId: string; amount: number }> = []

  // Separate creditors (positive balance = overpaid) and debtors (negative = underpaid)
  netBalances.forEach((balance, userId) => {
    if (balance > 0.01) {
      // Round to 2 decimals, ignore tiny amounts
      creditors.push({ userId, amount: Math.round(balance * 100) / 100 })
    } else if (balance < -0.01) {
      debtors.push({ userId, amount: Math.abs(Math.round(balance * 100) / 100) })
    }
  })

  // Match creditors with debtors to minimize transactions
  let creditorIndex = 0
  let debtorIndex = 0

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex]
    const debtor = debtors[debtorIndex]

    const settlementAmount = Math.min(creditor.amount, debtor.amount)

    balances.push({
      from_user_id: debtor.userId,
      to_user_id: creditor.userId,
      amount: settlementAmount,
    })

    creditor.amount -= settlementAmount
    debtor.amount -= settlementAmount

    if (creditor.amount < 0.01) creditorIndex++
    if (debtor.amount < 0.01) debtorIndex++
  }

  return balances
}

/**
 * Get net balance for a specific user across all gifts
 */
export function getUserNetBalance(
  userId: string,
  gifts: Gift[],
  expenses: Expense[]
): number {
  const balances = calculateBalances(gifts, expenses)

  let netBalance = 0
  balances.forEach(balance => {
    if (balance.from_user_id === userId) {
      netBalance -= balance.amount
    } else if (balance.to_user_id === userId) {
      netBalance += balance.amount
    }
  })

  return Math.round(netBalance * 100) / 100
}

/**
 * Calculate balance for a specific gift
 */
export function calculateGiftBalance(gift: Gift, expenses: Expense[]): Balance[] {
  return calculateBalances([gift], expenses)
}
