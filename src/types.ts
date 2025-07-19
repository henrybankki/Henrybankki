export type Role = 'user' | 'admin'

export interface AppUser {
  uid: string
  email: string | null
  displayName: string
  customerNumber: string | null
  role: Role
  kycStatus: 'pending' | 'approved' | 'rejected'
}
