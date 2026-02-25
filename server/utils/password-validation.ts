export const PASSWORD_MIN_LENGTH = 12

export const PASSWORD_RULES = [
  {
    id: 'length',
    label: `Au moins ${PASSWORD_MIN_LENGTH} caractères`,
    test: (p: string) => p.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'uppercase',
    label: 'Au moins 1 lettre majuscule',
    test: (p: string) => /[A-Z]/.test(p),
  },
  {
    id: 'lowercase',
    label: 'Au moins 1 lettre minuscule',
    test: (p: string) => /[a-z]/.test(p),
  },
  {
    id: 'digit',
    label: 'Au moins 1 chiffre',
    test: (p: string) => /[0-9]/.test(p),
  },
  {
    id: 'special',
    label: 'Au moins 1 caractère spécial (ex: !@#$%)',
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
]

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors = PASSWORD_RULES
    .filter(rule => !rule.test(password))
    .map(rule => rule.label)

  return { valid: errors.length === 0, errors }
}
