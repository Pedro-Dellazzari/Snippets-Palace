import { Variants } from 'framer-motion'

/** Backdrop semitransparente — fade simples em 150ms */
export const backdropVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit:    { opacity: 0, transition: { duration: 0.12 } }
}

/**
 * Painel do modal — spring para entrada (natural), ease rápido na saída.
 * stiffness 500 / damping 35 → rápido e sem bounce excessivo.
 */
export const modalVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: 'spring', stiffness: 500, damping: 35 }
  },
  exit: {
    opacity: 0, scale: 0.97, y: 4,
    transition: { duration: 0.12 }
  }
}
