import { LegalDoc, legalMetadata } from '@/components/LegalDoc';

// LEGAL: draft text, to be reviewed by a gestor before going live
export const generateMetadata = () => legalMetadata('aviso-legal');
export default function Page() {
  return <LegalDoc docKey="aviso-legal" />;
}
