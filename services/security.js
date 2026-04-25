import { nanoid } from 'nanoid'

/**
 * Generates a 20-character URL-safe string ID using nanoid
 * @returns {string}
 */
const id = () => nanoid(20)

export default { id }
