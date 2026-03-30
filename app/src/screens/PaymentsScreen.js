import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Share,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function PaymentsScreen({ route }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');

  const isMissingTableError = (error) => error?.code === 'PGRST205';

  // Check if navigated from Properties screen with payment intent
  const paymentIntent = route?.params;

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    if (paymentIntent) {
      handlePaymentIntent();
    }
  }, [paymentIntent]);

  const fetchPayments = async () => {
    try {
      setLoading(true);

      // Fetch payments with related tax and property information
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          taxes (
            *,
            properties (
              id,
              location,
              owner_id
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter payments for current user's properties
      const userPayments = data?.filter(payment => 
        payment.taxes?.properties?.owner_id === user.id
      ) || [];

      setPayments(userPayments);
    } catch (error) {
      if (isMissingTableError(error)) {
        setPayments([
          {
            id: 'DEMO-PAY-001',
            amount: 28470,
            status: 'completed',
            transaction_id: 'TXN-DEMO-001',
            created_at: new Date().toISOString(),
            taxes: {
              penalty: 0,
              properties: {
                id: 'DEMO-001',
                location: 'Pune, Maharashtra',
                owner_id: user?.id,
              },
            },
          },
        ]);
      } else {
        console.error('Error fetching payments:', error);
        setPayments([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentIntent = () => {
    const { taxId, propertyId, amount } = paymentIntent;
    
    Alert.alert(
      'Proceed to Payment',
      `You are about to pay ₹${amount?.toLocaleString('en-IN')} for Property ID: ${propertyId}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Pay Now',
          onPress: () => processPayment(taxId, amount),
        },
      ]
    );
  };

  const processPayment = async (taxId, amount) => {
    try {
      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            tax_id: taxId,
            user_id: user.id,
            amount: amount,
            status: 'completed',
            transaction_id: `TXN${Date.now()}`,
            payment_method: 'upi',
          },
        ])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update tax status to paid
      const { error: taxError } = await supabase
        .from('taxes')
        .update({ status: 'paid' })
        .eq('id', taxId);

      if (taxError) throw taxError;

      Alert.alert('Success', 'Payment completed successfully!');
      fetchPayments(); // Refresh payment list
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'Payment failed. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPayments();
    setRefreshing(false);
  };

  const getFilteredPayments = () => {
    if (filter === 'All') return payments;
    
    return payments.filter(payment => {
      if (filter === 'Projects') return payment.status === 'completed';
      if (filter === 'Penalty') return payment.taxes?.penalty > 0;
      if (filter === 'Others') return payment.status === 'pending' || payment.status === 'failed';
      return true;
    });
  };

  const calculateTotal = () => {
    return getFilteredPayments()
      .filter(p => p.status === 'completed')
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleShareReceipt = async (payment) => {
    try {
      const location = payment.taxes?.properties?.location || 'N/A';
      const receiptText = [
        'Estate Tax Collection - Payment Receipt',
        '',
        `Receipt ID: ${payment.transaction_id || `PAY-${payment.id}`}`,
        `Date: ${formatDate(payment.created_at)}`,
        `Property: ${location}`,
        `Amount Paid: ₹${(payment.amount || 0).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
        })}`,
        `Status: ${String(payment.status || 'unknown').toUpperCase()}`,
      ].join('\n');

      await Share.share({
        title: 'Payment Receipt',
        message: receiptText,
      });
    } catch (error) {
      console.error('Error sharing receipt:', error);
      Alert.alert('Error', 'Unable to generate receipt right now.');
    }
  };

  const generateReceiptHtml = (payment) => {
    const location = payment.taxes?.properties?.location || 'N/A';
    const amount = (payment.amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; color: #1b1f24; }
            .card { border: 1px solid #d6dce5; border-radius: 12px; padding: 18px; }
            .title { font-size: 20px; font-weight: 700; margin: 0 0 6px; }
            .subtitle { color: #5d6b7a; margin-bottom: 16px; font-size: 13px; }
            .row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
            .label { color: #5d6b7a; }
            .value { font-weight: 600; }
            .amount { margin-top: 14px; padding-top: 12px; border-top: 1px dashed #c7cfdb; font-size: 22px; font-weight: 800; color: #0f5aa3; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="title">Payment Receipt</div>
            <div class="subtitle">Estate Tax Collection System</div>
            <div class="row"><span class="label">Receipt ID</span><span class="value">${payment.transaction_id || `PAY-${payment.id}`}</span></div>
            <div class="row"><span class="label">Date</span><span class="value">${formatDate(payment.created_at)}</span></div>
            <div class="row"><span class="label">Property</span><span class="value">${location}</span></div>
            <div class="row"><span class="label">Status</span><span class="value">${String(payment.status || 'unknown').toUpperCase()}</span></div>
            <div class="amount">Amount Paid: INR ${amount}</div>
          </div>
        </body>
      </html>
    `;
  };

  const handleDownloadReceiptPDF = async (payment) => {
    try {
      const html = generateReceiptHtml(payment);
      const { uri } = await Print.printToFileAsync({ html });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('PDF Generated', `Receipt created at: ${uri}`);
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Payment Receipt',
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      console.error('Error generating PDF receipt:', error);
      Alert.alert('Error', 'Unable to generate PDF receipt right now.');
    }
  };

  if (loading) {
    const styles = createStyles(colors);
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading payments...</Text>
      </View>
    );
  }

  const styles = createStyles(colors);
  const filteredPayments = getFilteredPayments();
  const totalAmount = calculateTotal();

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Payment History</Text>
          <TouchableOpacity style={styles.profileButton}>
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.pageTitle}>History</Text>
      </View>

      <View style={styles.filterContainer}>
        {['All', 'Projects', 'Others', 'Penalty'].map((filterOption) => (
          <TouchableOpacity
            key={filterOption}
            style={filter === filterOption ? styles.filterButtonActive : styles.filterButton}
            onPress={() => setFilter(filterOption)}
          >
            <Text style={filter === filterOption ? styles.filterTextActive : styles.filterText}>
              {filterOption === 'All' ? 'All Logs' : filterOption}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.paymentsList}>
        {filteredPayments.length > 0 ? (
          filteredPayments.map((payment) => (
            <View key={payment.id} style={styles.paymentCard}>
              <View style={styles.paymentRow}>
                <View style={styles.paymentLeft}>
                  <Text style={styles.paymentId}>
                    {payment.transaction_id || `PAY-${payment.id}`}
                  </Text>
                  <Text style={styles.paymentDate}>
                    {formatDate(payment.created_at)}
                  </Text>
                  {payment.taxes?.properties && (
                    <Text style={styles.paymentProperty}>
                      Property: {payment.taxes.properties.location}
                    </Text>
                  )}
                </View>
                <View style={payment.status === 'completed' ? styles.statusBadgeSuccess : styles.statusBadgePending}>
                  <Text style={styles.statusText}>
                    {payment.status === 'completed' ? 'success' : payment.status}
                  </Text>
                </View>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentAmount}>
                  ₹{(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
                <TouchableOpacity
                  style={styles.receiptButton}
                  onPress={() => handleDownloadReceiptPDF(payment)}
                  onLongPress={() => handleShareReceipt(payment)}
                >
                  <Text style={styles.receiptText}>PDF RECEIPT</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyText}>No Payments Found</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'All' 
                ? 'Your payment history will appear here'
                : `No ${filter.toLowerCase()} payments found`}
            </Text>
          </View>
        )}
      </View>

      {filteredPayments.length > 0 && (
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {filter === 'All' ? 'TOTAL PAID' : `TOTAL (${filter.toUpperCase()})`}
            </Text>
            <Text style={styles.totalAmount}>
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  header: {
    backgroundColor: colors.headerBackground,
    padding: 20,
    paddingTop: 50,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    fontSize: 18,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.info + '40',
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  paymentsList: {
    padding: 20,
    paddingTop: 0,
  },
  paymentCard: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentLeft: {
    flex: 1,
  },
  paymentId: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  paymentDate: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 4,
  },
  paymentProperty: {
    color: colors.accent,
    fontSize: 11,
    marginTop: 4,
  },
  statusBadgeSuccess: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.success + '40',
  },
  statusBadgePending: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.warning + '40',
  },
  statusText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  paymentAmount: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  receiptButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.info + '40',
  },
  receiptText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  totalCard: {
    backgroundColor: colors.info + '40',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 80,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: colors.info,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  totalAmount: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
