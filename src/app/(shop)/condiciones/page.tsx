import { LegalDoc, legalMetadata } from '@/components/LegalDoc';

// LEGAL: draft text, to be reviewed by a gestor before going live
export const generateMetadata = () => legalMetadata('condiciones');
export default function Page() {
  return <LegalDoc docKey="condiciones" />;
}
