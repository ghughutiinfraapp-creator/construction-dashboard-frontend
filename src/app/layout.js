import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext';
import { Toaster } from 'react-hot-toast';
import WhatsAppButton from '../components/Whatsapp';

export const metadata = {
  title: 'Construction Platform',
  description: 'Construction management dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13.5px',
                background: '#1C1917',
                color: '#F5F5F4',
                borderRadius: '10px',
                padding: '10px 14px',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
          <WhatsAppButton phoneNumber="911234567890" message="Hi! I'd like to know more." />
        </AuthProvider>
      </body>
    </html>
  );
}