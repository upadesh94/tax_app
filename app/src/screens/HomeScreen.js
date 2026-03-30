import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../config/supabase';
import Svg, { Polyline, Circle, Rect } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('Good morning');
  const [stats, setStats] = useState({
    totalProperties: 0,
    pendingPayments: 0,
    totalDue: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [analytics, setAnalytics] = useState({
    monthlyTrend: [],
    distribution: {
      paid: 0,
      pending: 0,
      overdue: 0,
    },
  });

  const isMissingTableError = (error) => error?.code === 'PGRST205';

  useEffect(() => {
    fetchDashboardData();
    updateGreeting();
    
    // Update greeting every minute
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  const updateGreeting = () => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      setGreeting('Good morning');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good afternoon');
    } else if (hour >= 17 && hour < 21) {
      setGreeting('Good evening');
    } else {
      setGreeting('Good night');
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch properties count
      const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user.id);

      if (propError) throw propError;

      // Fetch taxes (pending payments)
      const { data: taxes, error: taxError } = await supabase
        .from('taxes')
        .select('*, properties(*)')
        .eq('properties.owner_id', user.id)
        .eq('status', 'pending');

      if (taxError) throw taxError;

      // Calculate total due
      const totalDue =
        taxes?.reduce(
          (sum, tax) => sum + (Number(tax.amount ?? tax.total_amount) || 0),
          0
        ) || 0;

      // Fetch recent payments
      const { data: payments, error: payError } = await supabase
        .from('payments')
        .select(`
          *,
          taxes (
            *,
            properties (*)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (payError) throw payError;

      const { data: allTaxes, error: allTaxesError } = await supabase
        .from('taxes')
        .select('status, due_date, amount, total_amount, properties(*)')
        .eq('properties.owner_id', user.id);

      if (allTaxesError) throw allTaxesError;

      // Format recent activities
      const activities = payments?.map(payment => ({
        id: payment.id,
        type: payment.status === 'completed' ? 'payment' : 'pending',
        title: payment.status === 'completed' ? 'Payment Successful' : 'Payment Pending',
        subtitle: `Property ID: ${payment.taxes?.properties?.id || 'N/A'}`,
        amount: Number(payment.amount) || 0,
        date: new Date(payment.created_at),
        status: payment.status,
      })) || [];

      setStats({
        totalProperties: properties?.length || 0,
        pendingPayments: taxes?.length || 0,
        totalDue: totalDue,
      });

      setRecentActivities(activities);

      const monthlyTrend = buildMonthlyTrend(payments || []);
      const distribution = buildDistribution(allTaxes || []);
      setAnalytics({ monthlyTrend, distribution });
    } catch (error) {
      if (isMissingTableError(error)) {
        setStats({
          totalProperties: 1,
          pendingPayments: 1,
          totalDue: 28470,
        });
        setRecentActivities([
          {
            id: 'demo-activity-1',
            type: 'pending',
            title: 'Tax Assessment Generated',
            subtitle: 'Property ID: DEMO-001',
            amount: 28470,
            date: new Date(),
            status: 'pending',
          },
        ]);
        setAnalytics({
          monthlyTrend: [
            { label: 'Nov', amount: 12000 },
            { label: 'Dec', amount: 18000 },
            { label: 'Jan', amount: 15000 },
            { label: 'Feb', amount: 21000 },
            { label: 'Mar', amount: 24000 },
            { label: 'Apr', amount: 19500 },
          ],
          distribution: {
            paid: 42000,
            pending: 28470,
            overdue: 9000,
          },
        });
      } else {
        console.error('Error fetching dashboard data:', error);
        setStats({
          totalProperties: 0,
          pendingPayments: 0,
          totalDue: 0,
        });
        setRecentActivities([]);
        setAnalytics({
          monthlyTrend: [],
          distribution: { paid: 0, pending: 0, overdue: 0 },
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const buildMonthlyTrend = (payments) => {
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleString('en-IN', { month: 'short' }),
        amount: 0,
      });
    }

    const monthMap = months.reduce((acc, month) => {
      acc[month.key] = month;
      return acc;
    }, {});

    payments.forEach((payment) => {
      const dt = new Date(payment.created_at);
      if (!Number.isFinite(dt.getTime())) return;
      const key = `${dt.getFullYear()}-${dt.getMonth()}`;
      const amount = Number(payment.amount) || 0;
      if (monthMap[key]) {
        monthMap[key].amount += amount;
      }
    });

    return months;
  };

  const buildDistribution = (taxes) => {
    const now = new Date();
    return taxes.reduce(
      (acc, tax) => {
        const amount = Number(tax.amount ?? tax.total_amount) || 0;
        const due = new Date(tax.due_date);
        const isOverdue = tax.status !== 'paid' && Number.isFinite(due.getTime()) && due < now;

        if (tax.status === 'paid') {
          acc.paid += amount;
        } else if (isOverdue) {
          acc.overdue += amount;
        } else {
          acc.pending += amount;
        }

        return acc;
      },
      { paid: 0, pending: 0, overdue: 0 }
    );
  };

  const renderMonthlyTrendChart = () => {
    const chartData = analytics.monthlyTrend;
    if (!chartData.length) {
      return (
        <View style={styles.chartEmptyState}>
          <Text style={styles.chartEmptyText}>No monthly payment trend yet</Text>
        </View>
      );
    }

    const chartWidth = width - 80;
    const chartHeight = 150;
    const maxAmount = Math.max(...chartData.map((item) => item.amount), 1);
    const stepX = chartWidth / (chartData.length - 1 || 1);

    const points = chartData.map((item, index) => {
      const x = index * stepX;
      const y = chartHeight - (item.amount / maxAmount) * (chartHeight - 20) - 10;
      return { x, y, label: item.label, amount: item.amount };
    });

    const pointsString = points.map((point) => `${point.x},${point.y}`).join(' ');

    return (
      <View>
        <Svg width={chartWidth} height={chartHeight}>
          <Polyline
            points={pointsString}
            fill="none"
            stroke={colors.accent}
            strokeWidth="3"
          />
          {points.map((point, idx) => (
            <Circle key={`point-${idx}`} cx={point.x} cy={point.y} r="4" fill={colors.info} />
          ))}
        </Svg>

        <View style={styles.chartLabelsRow}>
          {chartData.map((item) => (
            <Text key={item.label} style={styles.chartLabelText}>
              {item.label}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  const renderDistributionChart = () => {
    const { paid, pending, overdue } = analytics.distribution;
    const total = paid + pending + overdue;
    const safeTotal = total || 1;

    const paidPct = (paid / safeTotal) * 100;
    const pendingPct = (pending / safeTotal) * 100;
    const overduePct = (overdue / safeTotal) * 100;

    return (
      <View>
        <Svg width={width - 80} height={24}>
          <Rect x="0" y="0" width={`${paidPct}%`} height="24" fill={colors.success} rx="8" ry="8" />
          <Rect x={`${paidPct}%`} y="0" width={`${pendingPct}%`} height="24" fill={colors.info} />
          <Rect
            x={`${paidPct + pendingPct}%`}
            y="0"
            width={`${overduePct}%`}
            height="24"
            fill={colors.error}
            rx="8"
            ry="8"
          />
        </Svg>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>Paid ₹{paid.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.info }]} />
            <Text style={styles.legendText}>Pending ₹{pending.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
            <Text style={styles.legendText}>Overdue ₹{overdue.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </View>
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    const styles = createStyles(colors);
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {/* Animated Background */}
      <View style={styles.backgroundGradient}>
        <View style={[styles.floatingCircle, styles.circle1]} />
        <View style={[styles.floatingCircle, styles.circle2]} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName}>Aditya Barandwal</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.themeToggleButton}
              onPress={toggleTheme}
              activeOpacity={0.85}
            >
              <View style={styles.themeToggleIconWrap}>
                <Text style={styles.themeToggleIcon}>{isDarkMode ? '🌙' : '☀️'}</Text>
              </View>
              <Text style={styles.themeToggleText}>{isDarkMode ? 'Dark' : 'Light'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.profileIcon}>👤</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>🏠</Text>
            </View>
            <Text style={styles.statValue}>{stats.totalProperties}</Text>
            <Text style={styles.statLabel}>Properties</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>⏱️</Text>
            </View>
            <Text style={styles.statValue}>{stats.pendingPayments}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Balance Card with Gradient */}
        <View style={styles.balanceCardContainer}>
          <View style={styles.balanceCard}>
            <View style={styles.balanceGlow} />
            <Text style={styles.balanceLabel}>Total Tax Due</Text>
            <Text style={styles.balanceAmount}>
              ₹{stats.totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            <TouchableOpacity 
              style={styles.payNowButton}
              onPress={() => navigation.navigate('Payments')}
            >
              <Text style={styles.payNowText}>Pay Now</Text>
              <Text style={styles.payNowArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Analytics Dashboard */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analytics Dashboard</Text>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Monthly Payment Trend</Text>
            <Text style={styles.chartSubtitle}>Last 6 months collection pattern</Text>
            {renderMonthlyTrendChart()}
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Tax Distribution</Text>
            <Text style={styles.chartSubtitle}>Paid vs pending vs overdue value</Text>
            {renderDistributionChart()}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('Properties')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.info + '20' }]}>
                <Text style={styles.actionEmoji}>🏢</Text>
              </View>
              <Text style={styles.actionText}>Properties</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('TaxCalculator')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.accentLight + '20' }]}>
                <Text style={styles.actionEmoji}>🧮</Text>
              </View>
              <Text style={styles.actionText}>Calculator</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('Payments')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.accent + '20' }]}>
                <Text style={styles.actionEmoji}>💳</Text>
              </View>
              <Text style={styles.actionText}>Payments</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          
          {recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <View key={activity.id} style={styles.activityCard}>
                <View style={styles.activityIcon}>
                  <Text style={styles.activityEmoji}>
                    {activity.status === 'completed' ? '✅' : '⏳'}
                  </Text>
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activitySubtitle}>{activity.subtitle}</Text>
                </View>
                {activity.status === 'completed' ? (
                  <Text style={styles.activityAmount}>
                    ₹{activity.amount?.toLocaleString('en-IN')}
                  </Text>
                ) : (
                  <Text style={styles.activityTime}>{formatTimeAgo(activity.date)}</Text>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyActivityText}>No recent activity</Text>
              <Text style={styles.emptyActivitySubtext}>
                Your payment history will appear here
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  floatingCircle: {
    position: 'absolute',
    borderRadius: 1000,
    opacity: 0.1,
  },
  circle1: {
    width: 300,
    height: 300,
    backgroundColor: colors.accent,
    top: -50,
    right: -50,
  },
  circle2: {
    width: 250,
    height: 250,
    backgroundColor: colors.info,
    bottom: 100,
    left: -50,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greeting: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent + '33',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent + '4D',
  },
  profileIcon: {
    fontSize: 24,
  },
  themeToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  themeToggleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  themeToggleIcon: {
    fontSize: 15,
  },
  themeToggleText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent + '33',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  balanceCardContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  balanceCard: {
    position: 'relative',
    backgroundColor: colors.accent + '26',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: colors.accent + '4D',
    overflow: 'hidden',
  },
  balanceGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.accent,
    opacity: 0.1,
    top: -50,
    right: -50,
  },
  balanceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 1,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 20,
  },
  payNowButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  payNowText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  payNowArrow: {
    color: colors.background,
    fontSize: 20,
    marginLeft: 8,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 60) / 2,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionEmoji: {
    fontSize: 28,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chartCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  chartSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  chartLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  chartLabelText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  chartEmptyState: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  chartEmptyText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  legendContainer: {
    marginTop: 12,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent + '33',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityEmoji: {
    fontSize: 24,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  activitySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 16,
  },
  emptyActivity: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyActivityText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyActivitySubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
