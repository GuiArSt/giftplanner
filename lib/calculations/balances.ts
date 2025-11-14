/**
 * Balance calculation logic for Tricount-style expense tracking
 *
 * Key principles:
 * 1. Expenses are independent entities (not gift-based)
 * 2. Each expense has PARTICIPANTS (who benefits/splits the cost)
 * 3. Each expense has PAYERS (who actually paid)
 * 4. Balance = sum across all expenses: (what you paid - your share)
 * 5. Gifts are optional organizational tags only
 *
 * Example:
 * - Expense: €60 for dinner
 * - Participants: Alice, Bob, Charlie (split equally = €20 each)
 * - Payers: Alice paid €60
 * - Result: Bob owes Alice €20, Charlie owes Alice €20
 */

export interface ExpensePayer {
  user_id: string
  amount_paid: number
}

export interface ExpenseParticipant {
  user_id: string
  share_amount: number | null // null means equal split
}

export interface Expense {
  id: string
  amount: number
  payers: ExpensePayer[]
  participants: ExpenseParticipant[]
}

export interface Balance {
  from_user_id: string
  to_user_id: string
  amount: number
}

/**
 * Calculate balances across all expenses (Tricount-style)
 *
 * Algorithm:
 * 1. For each expense:
 *    a. Calculate each participant's share (equal or custom)
 *    b. Calculate what each payer actually paid
 * 2. For each user, aggregate: total_paid - total_share
 * 3. Positive balance = others owe you, Negative = you owe others
 * 4. Generate settlement suggestions to minimize transactions
 */
export function calculateBalances(expenses: Expense[]): Balance[] {
  // Track net balance for each user across all expenses
  const netBalances = new Map<string, number>()

  // Process each expense
  expenses.forEach(expense => {
    const totalAmount = expense.amount
    const participantCount = expense.participants.length

    if (participantCount === 0) return

    // Calculate what each participant should pay (their share)
    const shares = new Map<string, number>()
    let totalCustomShares = 0
    let participantsWithoutCustom = 0

    expense.participants.forEach(participant => {
      if (participant.share_amount !== null) {
        shares.set(participant.user_id, participant.share_amount)
        totalCustomShares += participant.share_amount
      } else {
        participantsWithoutCustom++
      }
    })

    // For participants without custom share, split remaining equally
    const remainingAmount = totalAmount - totalCustomShares
    const equalSplitAmount = participantsWithoutCustom > 0
      ? remainingAmount / participantsWithoutCustom
      : 0

    expense.participants.forEach(participant => {
      if (participant.share_amount === null) {
        shares.set(participant.user_id, equalSplitAmount)
      }
    })

    // Update net balances: subtract each participant's share
    shares.forEach((share, userId) => {
      const currentBalance = netBalances.get(userId) || 0
      netBalances.set(userId, currentBalance - share)
    })

    // Update net balances: add what each payer actually paid
    expense.payers.forEach(payer => {
      const currentBalance = netBalances.get(payer.user_id) || 0
      netBalances.set(payer.user_id, currentBalance + payer.amount_paid)
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

  // Sort by amount (largest first) to minimize transaction count
  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

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
 * Get net balance for a specific user across all expenses
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

/**
 * Get balances between a specific user and other users
 * Privacy-aware: only shows balances with people they share expenses with
 */
export function getUserBalancesWith(
  userId: string,
  expenses: Expense[]
): Balance[] {
  // Filter to only expenses this user is involved in
  const userExpenses = expenses.filter(expense => {
    const isPayer = expense.payers.some(p => p.user_id === userId)
    const isParticipant = expense.participants.some(p => p.user_id === userId)
    return isPayer || isParticipant
  })

  const allBalances = calculateBalances(userExpenses)

  // Filter to only balances involving this user
  return allBalances.filter(balance =>
    balance.from_user_id === userId || balance.to_user_id === userId
  )
}

/**
 * Calculate total expenses for display purposes
 */
export function calculateTotalExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0)
}
