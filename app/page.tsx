import {redirect} from 'next/navigation';

// Root page redirects users directly to the default locale (Polish).
export default function RootPage() {
  redirect('/pl');
}
