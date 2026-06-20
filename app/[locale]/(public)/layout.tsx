import { ReactNode } from 'react';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import RealtimeTableListener from '@/components/common/realtime-table-listener';

type Props = {
  children: ReactNode;
};

export default function PublicLayout({ children }: Props) {
  return (
    <div className="flex flex-col min-h-screen">
      <RealtimeTableListener
        channelName="public-global-realtime"
        tables={[
          'system_settings',
          'operational_status',
          'service_hours',
          'holiday_closures',
          'categories',
          'menu_items',
          'delivery_fee_rules',
          'packaging_fee_rules',
          'site_content',
          'dining_tables'
        ]}
      />
      <Header />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}
