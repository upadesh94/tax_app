import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const PROPERTY_TAX_HISTORY_KEY = 'property_tax_calculation_history';

export default function TaxCalculatorScreen() {
  const { colors } = useTheme();
  const [propertyValue, setPropertyValue] = useState('');
  const [area, setArea] = useState('');
  const [propertyType, setPropertyType] = useState('residential');
  const [location, setLocation] = useState('urban');
  const [calculatedTax, setCalculatedTax] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [taxRates, setTaxRates] = useState(null);
  const [calculationHistory, setCalculationHistory] = useState([]);

  useEffect(() => {
    fetchTaxRates();
    loadHistory();
  }, []);

  useEffect(() => {
    // Real-time calculation
    if (propertyValue && area) {
      calculateTaxRealTime();
    } else {
      setCalculatedTax(null);
    }
  }, [propertyValue, area, propertyType, location]);

  const fetchTaxRates = async () => {
    try {
      const { data, error } = await supabase
        .from('tax_rates')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setTaxRates(data);
    } catch (error) {
      if (error?.code !== 'PGRST205') {
        console.error('Error fetching tax rates:', error);
      }
      // Use default rates if database fetch fails
      setTaxRates({
        residential_rate: 0.01,
        commercial_rate: 0.015,
        area_rate: 10,
      });
    }
  };

  const loadHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem(PROPERTY_TAX_HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setCalculationHistory(parsed);
      }
    } catch (error) {
      console.error('Error loading property tax history:', error);
    }
  };

  const saveCalculationToHistory = async () => {
    if (!calculatedTax) {
      Alert.alert('No Calculation', 'Please enter valid values before saving history.');
      return;
    }

    const entry = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      propertyValue,
      area,
      propertyType,
      location,
      totalTax: calculatedTax.totalTax,
      baseTax: calculatedTax.baseTax,
      areaTax: calculatedTax.areaTax,
      serviceFee: calculatedTax.serviceFee,
    };

    const updated = [entry, ...calculationHistory].slice(0, 10);
    setCalculationHistory(updated);
    await AsyncStorage.setItem(PROPERTY_TAX_HISTORY_KEY, JSON.stringify(updated));
    Alert.alert('Saved', 'Calculation saved to history.');
  };

  const applyHistoryItem = (item) => {
    setPropertyValue(item.propertyValue || '');
    setArea(item.area || '');
    setPropertyType(item.propertyType || 'residential');
    setLocation(item.location || 'urban');
  };

  const clearHistory = async () => {
    setCalculationHistory([]);
    await AsyncStorage.removeItem(PROPERTY_TAX_HISTORY_KEY);
    Alert.alert('Cleared', 'Property tax calculation history cleared.');
  };

  const calculateTaxRealTime = () => {
    const value = parseFloat(propertyValue.replace(/,/g, ''));
    const sqft = parseFloat(area.replace(/,/g, ''));

    if (isNaN(value) || isNaN(sqft) || value <= 0 || sqft <= 0) {
      setCalculatedTax(null);
      return;
    }

    const rates = taxRates || {
      residential_rate: 0.01,
      commercial_rate: 0.015,
      area_rate: 10,
    };

    const taxRate = propertyType === 'residential' ? rates.residential_rate : rates.commercial_rate;
    const areaRate = Number(rates.area_rate) || 10;
    
    // Location multiplier
    const locationMultiplier = location === 'urban' ? 1.2 : 1.0;

    const baseTax = value * taxRate * locationMultiplier;
    const areaTax = sqft * areaRate;
    const serviceFee = 70;
    const totalTax = baseTax + areaTax + serviceFee;

    setCalculatedTax({
      baseTax: baseTax,
      areaTax: areaTax,
      serviceFee: serviceFee,
      totalTax: totalTax,
      taxRate: (taxRate * 100).toFixed(2),
      areaRate,
      locationMultiplier: locationMultiplier,
    });

    // Animate result
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (!cleaned) return '';
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
      useGrouping: true,
    }).format(Number(cleaned));
  };

  const handlePropertyValueChange = (text) => {
    const formatted = formatNumber(text);
    setPropertyValue(formatted);
  };

  const handleAreaChange = (text) => {
    const formatted = formatNumber(text);
    setArea(formatted);
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {/* Animated Background */}
      <View style={styles.backgroundGradient}>
        <View style={[styles.floatingCircle, styles.circle1]} />
        <View style={[styles.floatingCircle, styles.circle2]} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tax Calculator</Text>
          <Text style={styles.subtitle}>Calculate your property tax instantly</Text>
        </View>

        {/* Input Card */}
        <View style={styles.inputCard}>
          {/* Property Value */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Property Value</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                value={propertyValue}
                onChangeText={handlePropertyValueChange}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Area */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Area</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                value={area}
                onChangeText={handleAreaChange}
                keyboardType="numeric"
              />
              <Text style={styles.unitLabel}>sq.ft</Text>
            </View>
          </View>

          {/* Property Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Property Type</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  propertyType === 'residential' && styles.toggleButtonActive,
                ]}
                onPress={() => setPropertyType('residential')}
                activeOpacity={0.8}
              >
                <Text style={styles.toggleIcon}>🏠</Text>
                <Text
                  style={[
                    styles.toggleText,
                    propertyType === 'residential' && styles.toggleTextActive,
                  ]}
                >
                  Residential
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  propertyType === 'commercial' && styles.toggleButtonActive,
                ]}
                onPress={() => setPropertyType('commercial')}
                activeOpacity={0.8}
              >
                <Text style={styles.toggleIcon}>🏢</Text>
                <Text
                  style={[
                    styles.toggleText,
                    propertyType === 'commercial' && styles.toggleTextActive,
                  ]}
                >
                  Commercial
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Location</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  location === 'urban' && styles.toggleButtonActive,
                ]}
                onPress={() => setLocation('urban')}
                activeOpacity={0.8}
              >
                <Text style={styles.toggleIcon}>🌆</Text>
                <Text
                  style={[
                    styles.toggleText,
                    location === 'urban' && styles.toggleTextActive,
                  ]}
                >
                  Urban
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  location === 'rural' && styles.toggleButtonActive,
                ]}
                onPress={() => setLocation('rural')}
                activeOpacity={0.8}
              >
                <Text style={styles.toggleIcon}>🌾</Text>
                <Text
                  style={[
                    styles.toggleText,
                    location === 'rural' && styles.toggleTextActive,
                  ]}
                >
                  Rural
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Result Card */}
        {calculatedTax && (
          <Animated.View style={[styles.resultCard, { opacity: fadeAnim }]}>
            <View style={styles.resultGlow} />
            
            <Text style={styles.resultTitle}>Tax Breakdown</Text>

            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLeft}>
                <Text style={styles.breakdownIcon}>💰</Text>
                <View>
                  <Text style={styles.breakdownLabel}>Base Tax</Text>
                  <Text style={styles.breakdownSubtext}>
                    {calculatedTax.taxRate}% of property value
                  </Text>
                </View>
              </View>
              <Text style={styles.breakdownValue}>
                {formatCurrency(calculatedTax.baseTax)}
              </Text>
            </View>

            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLeft}>
                <Text style={styles.breakdownIcon}>📐</Text>
                <View>
                  <Text style={styles.breakdownLabel}>Area Tax</Text>
                  <Text style={styles.breakdownSubtext}>
                    ₹{calculatedTax.areaRate} per sq.ft
                  </Text>
                </View>
              </View>
              <Text style={styles.breakdownValue}>
                {formatCurrency(calculatedTax.areaTax)}
              </Text>
            </View>

            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLeft}>
                <Text style={styles.breakdownIcon}>🏛️</Text>
                <View>
                  <Text style={styles.breakdownLabel}>Service Fee</Text>
                  <Text style={styles.breakdownSubtext}>Processing charge</Text>
                </View>
              </View>
              <Text style={styles.breakdownValue}>
                {formatCurrency(calculatedTax.serviceFee)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Tax Amount</Text>
              <Text style={styles.totalAmount}>
                {formatCurrency(calculatedTax.totalTax)}
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                This is an estimated calculation. Actual tax may vary based on local regulations.
              </Text>
            </View>

            <TouchableOpacity style={styles.saveHistoryButton} onPress={saveCalculationToHistory}>
              <Text style={styles.saveHistoryText}>Save Calculation to History</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {!calculatedTax && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧮</Text>
            <Text style={styles.emptyText}>Enter property details</Text>
            <Text style={styles.emptySubtext}>
              Fill in the property value and area to calculate tax
            </Text>
          </View>
        )}

        {calculationHistory.length > 0 && (
          <View style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Recent Calculation History</Text>
              <TouchableOpacity onPress={clearHistory}>
                <Text style={styles.clearHistoryText}>Clear</Text>
              </TouchableOpacity>
            </View>

            {calculationHistory.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.historyItem}
                onPress={() => applyHistoryItem(item)}
              >
                <View style={styles.historyItemTop}>
                  <Text style={styles.historyAmount}>{formatCurrency(item.totalTax || 0)}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(item.createdAt).toLocaleString('en-IN')}
                  </Text>
                </View>
                <Text style={styles.historyMeta}>
                  {item.propertyType?.toUpperCase()} • {item.location?.toUpperCase()} • ₹{item.propertyValue} • {item.area} sq.ft
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
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
    backgroundColor: colors.info,
    top: -50,
    right: -50,
  },
  circle2: {
    width: 250,
    height: 250,
    backgroundColor: colors.accentLight,
    bottom: 100,
    left: -50,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  inputCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencySymbol: {
    fontSize: 20,
    color: colors.accent,
    fontWeight: '700',
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  unitLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleButtonActive: {
    backgroundColor: colors.glassStrong,
    borderColor: colors.accent,
  },
  toggleIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.accent,
  },
  resultCard: {
    backgroundColor: colors.glassStrong,
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: colors.accent,
    position: 'relative',
    overflow: 'hidden',
  },
  resultGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.accent,
    opacity: 0.1,
    top: -50,
    right: -50,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 20,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  breakdownIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  breakdownLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  breakdownSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
  divider: {
    height: 2,
    backgroundColor: colors.accentLight,
    marginVertical: 16,
  },
  totalContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.accent,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.glass,
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  saveHistoryButton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: colors.cardBackground,
  },
  saveHistoryText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  historyCard: {
    marginHorizontal: 24,
    marginTop: 18,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  clearHistoryText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '700',
  },
  historyItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.glass,
  },
  historyItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyAmount: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 15,
  },
  historyDate: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  historyMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
