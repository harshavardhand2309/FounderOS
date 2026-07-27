import LegalDoc from '../components/LegalDoc.jsx'
import { DOCS } from '../content/legal.js'

export default function Legal({ doc }) {
  return <LegalDoc doc={DOCS[doc]} />
}
