/**
 * Balance calculation logic for expense tracking
 * 
 * This calculates who owes what to whom based on expenses and contributions.
 * Uses a simplified settlement algorithm that minimizes transactions.
 */

export interface ExpenseContributor {
  user_id: string
  amount_paid: number
}

export interface Expense {
  id: string
  recipient_id: string
  amount: number
  contributors: ExpenseContributor[]
}

export interface Balance {
  from_user_id: string
  to_user_id: string
  amount: number
}

/**
 * Calculate balances between users based on expenses
 * 
 * Algorithm:
 * 1. For each expense, calculate how much each contributor should pay (split equally)
 * 2. Track net balance: (amount_paid - amount_owed) for each user
 * 3. Generate settlement suggestions to minimize transactions
 */
export function calculateBalances(expenses: Expense[]): Balance[] {
  // Track net balance for each user
  const netBalances = new Map<string, number>()

  // Process each expense
  expenses.forEach(expense => {
    const totalAmount = expense.amount
    const contributorCount = expense.contributors.length

    if (contributorCount === 0) return

    const amountPerPerson = totalAmount / contributorCount

    // For each contributor, calculate what they paid vs what they owe
    expense.contributors.forEach(contributor => {
      const currentBalance = netBalances.get(contributor.user_id) || 0
      // Positive = they paid more than owed, Negative = they owe more
      netBalances.set(
        contributor.user_id,
        currentBalance + (contributor.amount_paid - amountPerPerson)
      )
    })
  })

  // Generate settlement transactions
  const balances: Balance[] = []
  const creditors: Array<{ userId: string; amount: number }> = []
  const debtors: Array<{ userId: string; amount: number }> = []

  // Separate creditors (positive balance) and debtors (negative balance)
  netBalances.forEach((balance, userId) => {
    if (balance > 0.01) {
      // Round to 2 decimals, ignore tiny amounts
      creditors.push({ userId, amount: Math.round(balance * 100) / 100 })
    } else if (balance < -0.01) {
      debtors.push({ userId, amount: Math.abs(Math.round(balance * 100) / 100) })
    }
  })

  // Match creditors with debtors
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
 * Get net balance for a specific user
 */
export function getUserNetBalance(
  userId: string,
  expenses: Expense[]
): number {
  const balances = calculateBalances(expenses)
  
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



