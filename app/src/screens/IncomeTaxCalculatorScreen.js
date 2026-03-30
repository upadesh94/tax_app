import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const INCOME_TAX_HISTORY_KEY = 'income_tax_calculation_history';

export default function IncomeTaxCalculatorScreen() {
  const { colors } = useTheme();
  const [annualIncome, setAnnualIncome] = useState('');
  const [taxRegime, setTaxRegime] = useState('new'); // 'new' or 'old'
  const [incomeType, setIncomeType] = useState('salaried'); // 'salaried' or 'other'
  const [deductions80C, setDeductions80C] = useState('');
  const [deductions80D, setDeductions80D] = useState('');
  const [otherDeductions, setOtherDeductions] = useState('');
  const [result, setResult] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showDeductions, setShowDeductions] = useState(false);
  const [calculationHistory, setCalculationHistory] = useState([]);
  const styles = createStyles(colors);

  useEffect(() => {
    setShowDeductions(taxRegime === 'old');
    if (taxRegime === 'new') {
      setDeductions80C('');
      setDeductions80D('');
      setOtherDeductions('');
    }
  }, [taxRegime]);

  useEffect(() => {
    const loadPreferredRegime = async () => {
      const savedRegime = await AsyncStorage.getItem('preferredTaxRegime');
      if (savedRegime === 'old' || savedRegime === 'new') {
        setTaxRegime(savedRegime);
      }
    };

    loadPreferredRegime();
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const raw = await AsyncStorage.getItem(INCOME_TAX_HISTORY_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCalculationHistory(parsed);
        }
      } catch (error) {
        console.error('Error loading income tax history:', error);
      }
    };

    loadHistory();
  }, []);

  const handleTaxRegimeChange = async (regime) => {
    setTaxRegime(regime);
    await AsyncStorage.setItem('preferredTaxRegime', regime);
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

  const parseAmount = (text) => {
    if (!text) return 0;
    const value = parseFloat(String(text).replace(/,/g, ''));
    return Number.isFinite(value) ? value : 0;
  };

  const handleIncomeChange = (text) => {
    const formatted = formatNumber(text);
    setAnnualIncome(formatted);
  };

  const handleDeductionChange = (text, setter) => {
    const formatted = formatNumber(text);
    setter(formatted);
  };

  const calculateNewRegimeTax = (income) => {
    const slabs = [
      { limit: 300000, rate: 0 },
      { limit: 600000, rate: 0.05 },
      { limit: 900000, rate: 0.10 },
      { limit: 1200000, rate: 0.15 },
      { limit: 1500000, rate: 0.20 },
      { limit: Infinity, rate: 0.30 },
    ];

    let tax = 0;
    let previousLimit = 0;
    const breakdown = [];

    for (const slab of slabs) {
      if (income > previousLimit) {
        const taxableInSlab = Math.min(income, slab.limit) - previousLimit;
        const taxInSlab = taxableInSlab * slab.rate;
        tax += taxInSlab;

        if (taxableInSlab > 0) {
          breakdown.push({
            range: `₹${(previousLimit / 100000).toFixed(1)}L - ₹${slab.limit === Infinity ? '15L+' : (slab.limit / 100000).toFixed(1) + 'L'}`,
            rate: `${(slab.rate * 100).toFixed(0)}%`,
            amount: taxableInSlab,
            tax: taxInSlab,
          });
        }
      }
      previousLimit = slab.limit;
      if (income <= slab.limit) break;
    }

    return { tax, breakdown };
  };

  const calculateOldRegimeTax = (income) => {
    const slabs = [
      { limit: 250000, rate: 0 },
      { limit: 500000, rate: 0.05 },
      { limit: 1000000, rate: 0.20 },
      { limit: Infinity, rate: 0.30 },
    ];

    let tax = 0;
    let previousLimit = 0;
    const breakdown = [];

    for (const slab of slabs) {
      if (income > previousLimit) {
        const taxableInSlab = Math.min(income, slab.limit) - previousLimit;
        const taxInSlab = taxableInSlab * slab.rate;
        tax += taxInSlab;

        if (taxableInSlab > 0) {
          breakdown.push({
            range: `₹${(previousLimit / 100000).toFixed(1)}L - ₹${slab.limit === Infinity ? '10L+' : (slab.limit / 100000).toFixed(1) + 'L'}`,
            rate: `${(slab.rate * 100).toFixed(0)}%`,
            amount: taxableInSlab,
            tax: taxInSlab,
          });
        }
      }
      previousLimit = slab.limit;
      if (income <= slab.limit) break;
    }

    return { tax, breakdown };
  };

  const calculateTax = () => {
    const income = parseAmount(annualIncome);

    if (income <= 0) {
      Alert.alert('Invalid Input', 'Please enter your annual income');
      return;
    }

    const standardDeduction =
      incomeType === 'salaried'
        ? taxRegime === 'new'
          ? 75000
          : 50000
        : 0;

    let totalDeductions = 0;
    if (taxRegime === 'old') {
      const ded80C = parseAmount(deductions80C);
      const ded80D = parseAmount(deductions80D);
      const otherDed = parseAmount(otherDeductions);
      totalDeductions =
        standardDeduction +
        Math.min(ded80C, 150000) +
        Math.min(ded80D, 25000) +
        otherDed;
    } else {
      totalDeductions = standardDeduction;
    }

    const taxableIncome = Math.max(income - totalDeductions, 0);

    const { tax, breakdown } = taxRegime === 'new' 
      ? calculateNewRegimeTax(taxableIncome)
      : calculateOldRegimeTax(taxableIncome);

    // Apply rebate under Section 87A
    let rebate = 0;
    if (taxRegime === 'new' && taxableIncome <= 700000) {
      rebate = Math.min(tax, 25000);
    } else if (taxRegime === 'old' && taxableIncome <= 500000) {
      rebate = Math.min(tax, 12500);
    }

    const taxAfterRebate = Math.max(tax - rebate, 0);
    const cess = taxAfterRebate * 0.04; // 4% Health & Education Cess
    const taxWithCess = taxAfterRebate + cess;

    // Marginal relief near rebate limits so tax does not exceed excess income.
    const rebateThreshold = taxRegime === 'new' ? 700000 : 500000;
    const excessIncome = Math.max(taxableIncome - rebateThreshold, 0);
    let marginalRelief = 0;
    let finalTax = taxWithCess;

    if (excessIncome > 0 && taxWithCess > excessIncome) {
      marginalRelief = taxWithCess - excessIncome;
      finalTax = excessIncome;
    }

    const calculationResult = {
      income,
      incomeType,
      standardDeduction,
      totalDeductions,
      taxableIncome,
      breakdown,
      baseTax: tax,
      rebate,
      taxAfterRebate,
      cess,
      marginalRelief,
      finalTax,
    };

    setResult(calculationResult);
    saveCalculationToHistory(calculationResult);

    // Animate result
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const saveCalculationToHistory = async (calculationResult) => {
    const entry = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      taxRegime,
      incomeType,
      annualIncome,
      deductions80C,
      deductions80D,
      otherDeductions,
      finalTax: calculationResult.finalTax,
      taxableIncome: calculationResult.taxableIncome,
    };

    const updated = [entry, ...calculationHistory].slice(0, 10);
    setCalculationHistory(updated);
    await AsyncStorage.setItem(INCOME_TAX_HISTORY_KEY, JSON.stringify(updated));
  };

  const applyHistoryItem = async (item) => {
    setAnnualIncome(item.annualIncome || '');
    setIncomeType(item.incomeType || 'salaried');
    await handleTaxRegimeChange(item.taxRegime || 'new');
    setDeductions80C(item.deductions80C || '');
    setDeductions80D(item.deductions80D || '');
    setOtherDeductions(item.otherDeductions || '');
  };

  const clearHistory = async () => {
    setCalculationHistory([]);
    await AsyncStorage.removeItem(INCOME_TAX_HISTORY_KEY);
    Alert.alert('Cleared', 'Income tax calculation history cleared.');
  };

  const resetCalculator = () => {
    setAnnualIncome('');
    setIncomeType('salaried');
    setDeductions80C('');
    setDeductions80D('');
    setOtherDeductions('');
    setResult(null);
    fadeAnim.setValue(0);
  };

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
          <Text style={styles.title}>Income Tax Calculator</Text>
          <Text style={styles.subtitle}>Calculate your tax in simple steps 🇮🇳</Text>
        </View>

        {/* Input Card */}
        <View style={styles.inputCard}>
          {/* Annual Income */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Your Yearly Salary</Text>
            <Text style={styles.helpText}>Enter your total annual income</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                value={annualIncome}
                onChangeText={handleIncomeChange}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Income Type</Text>
            <Text style={styles.helpText}>Standard deduction is applied for salaried taxpayers</Text>
            <View style={styles.regimeContainer}>
              <TouchableOpacity
                style={[
                  styles.regimeButton,
                  incomeType === 'salaried' && styles.regimeButtonActive,
                ]}
                onPress={() => setIncomeType('salaried')}
                activeOpacity={0.8}
              >
                <View style={styles.regimeContent}>
                  <Text style={styles.regimeIcon}>💼</Text>
                  <View style={styles.regimeTextContainer}>
                    <Text
                      style={[
                        styles.regimeTitle,
                        incomeType === 'salaried' && styles.regimeTextActive,
                      ]}
                    >
                      Salaried
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.regimeButton,
                  incomeType === 'other' && styles.regimeButtonActive,
                ]}
                onPress={() => setIncomeType('other')}
                activeOpacity={0.8}
              >
                <View style={styles.regimeContent}>
                  <Text style={styles.regimeIcon}>📊</Text>
                  <View style={styles.regimeTextContainer}>
                    <Text
                      style={[
                        styles.regimeTitle,
                        incomeType === 'other' && styles.regimeTextActive,
                      ]}
                    >
                      Other Income
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tax Regime Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Choose Tax Regime</Text>
            <Text style={styles.helpText}>Select which tax system you prefer</Text>
            <View style={styles.regimeContainer}>
              <TouchableOpacity
                style={[
                  styles.regimeButton,
                  taxRegime === 'new' && styles.regimeButtonActive,
                ]}
                onPress={() => handleTaxRegimeChange('new')}
                activeOpacity={0.8}
              >
                <View style={styles.regimeContent}>
                  <Text style={styles.regimeIcon}>✨</Text>
                  <View style={styles.regimeTextContainer}>
                    <Text
                      style={[
                        styles.regimeTitle,
                        taxRegime === 'new' && styles.regimeTextActive,
                      ]}
                    >
                      New Regime
                    </Text>
                    <Text style={styles.regimeSubtext}>Lower rates, limited deductions</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.regimeButton,
                  taxRegime === 'old' && styles.regimeButtonActive,
                ]}
                onPress={() => handleTaxRegimeChange('old')}
                activeOpacity={0.8}
              >
                <View style={styles.regimeContent}>
                  <Text style={styles.regimeIcon}>📋</Text>
                  <View style={styles.regimeTextContainer}>
                    <Text
                      style={[
                        styles.regimeTitle,
                        taxRegime === 'old' && styles.regimeTextActive,
                      ]}
                    >
                      Old Regime
                    </Text>
                    <Text style={styles.regimeSubtext}>Higher rates, broader deductions</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Deductions (Only for Old Regime) */}
          {showDeductions && (
            <View style={styles.deductionsSection}>
              <Text style={styles.deductionsTitle}>💰 Tax Deductions</Text>
              <Text style={styles.deductionsSubtext}>
                Enter your eligible deductions (optional)
              </Text>

              <View style={styles.deductionItem}>
                <Text style={styles.deductionLabel}>Section 80C</Text>
                <Text style={styles.deductionHelp}>
                  PPF, ELSS, Life Insurance (Max: ₹1.5L)
                </Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    value={deductions80C}
                    onChangeText={(text) => handleDeductionChange(text, setDeductions80C)}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.deductionItem}>
                <Text style={styles.deductionLabel}>Section 80D</Text>
                <Text style={styles.deductionHelp}>
                  Health Insurance (Max: ₹25K)
                </Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    value={deductions80D}
                    onChangeText={(text) => handleDeductionChange(text, setDeductions80D)}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.deductionItem}>
                <Text style={styles.deductionLabel}>Other Deductions</Text>
                <Text style={styles.deductionHelp}>
                  HRA, Home Loan Interest, etc.
                </Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    value={otherDeductions}
                    onChangeText={(text) => handleDeductionChange(text, setOtherDeductions)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Calculate Button */}
          <TouchableOpacity
            style={styles.calculateButton}
            onPress={calculateTax}
            activeOpacity={0.8}
          >
            <Text style={styles.calculateButtonText}>Calculate My Tax</Text>
            <Text style={styles.calculateButtonIcon}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Result Card */}
        {result && (
          <Animated.View style={[styles.resultCard, { opacity: fadeAnim }]}>
            <View style={styles.resultGlow} />

            {/* Final Tax Amount */}
            <View style={styles.finalTaxContainer}>
              <Text style={styles.finalTaxLabel}>Your Total Tax</Text>
              <Text style={styles.finalTaxAmount}>
                {formatCurrency(result.finalTax)}
              </Text>
              <Text style={styles.finalTaxSubtext}>
                Including 4% Health & Education Cess
              </Text>
            </View>

            {/* Step-by-Step Breakdown */}
            <View style={styles.breakdownSection}>
              <Text style={styles.breakdownTitle}>📊 Step-by-Step Breakdown</Text>

              {/* Step 1: Income */}
              <View style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepNumber}>1</Text>
                  <Text style={styles.stepTitle}>Your Annual Income</Text>
                </View>
                <Text style={styles.stepAmount}>{formatCurrency(result.income)}</Text>
              </View>

              {/* Step 2: Deductions */}
              {result.totalDeductions > 0 && (
                <View style={styles.stepCard}>
                  <View style={styles.stepHeader}>
                    <Text style={styles.stepNumber}>2</Text>
                    <Text style={styles.stepTitle}>Total Deductions (incl. standard deduction)</Text>
                  </View>
                  <Text style={[styles.stepAmount, styles.deductionAmount]}>
                    - {formatCurrency(result.totalDeductions)}
                  </Text>
                </View>
              )}

              {/* Step 3: Taxable Income */}
              <View style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepNumber}>{result.totalDeductions > 0 ? '3' : '2'}</Text>
                  <Text style={styles.stepTitle}>Taxable Income</Text>
                </View>
                <Text style={styles.stepAmount}>{formatCurrency(result.taxableIncome)}</Text>
              </View>

              {/* Tax Slabs */}
              <View style={styles.slabsCard}>
                <Text style={styles.slabsTitle}>Tax Per Income Slab</Text>
                {result.breakdown.map((slab, index) => (
                  <View key={index} style={styles.slabRow}>
                    <View style={styles.slabLeft}>
                      <Text style={styles.slabRange}>{slab.range}</Text>
                      <Text style={styles.slabRate}>@ {slab.rate}</Text>
                    </View>
                    <Text style={styles.slabTax}>{formatCurrency(slab.tax)}</Text>
                  </View>
                ))}
                <View style={styles.slabDivider} />
                <View style={styles.slabRow}>
                  <Text style={styles.slabTotalLabel}>Base Tax</Text>
                  <Text style={styles.slabTotalValue}>{formatCurrency(result.baseTax)}</Text>
                </View>
              </View>

              {/* Rebate */}
              {result.rebate > 0 && (
                <View style={styles.rebateCard}>
                  <Text style={styles.rebateIcon}>🎉</Text>
                  <View style={styles.rebateContent}>
                    <Text style={styles.rebateTitle}>Section 87A Rebate</Text>
                    <Text style={styles.rebateSubtext}>
                      You're eligible for tax rebate!
                    </Text>
                  </View>
                  <Text style={styles.rebateAmount}>- {formatCurrency(result.rebate)}</Text>
                </View>
              )}

              {result.marginalRelief > 0 && (
                <View style={styles.rebateCard}>
                  <Text style={styles.rebateIcon}>🛡️</Text>
                  <View style={styles.rebateContent}>
                    <Text style={styles.rebateTitle}>Marginal Relief</Text>
                    <Text style={styles.rebateSubtext}>
                      Applied near rebate threshold as per Indian tax rules.
                    </Text>
                  </View>
                  <Text style={styles.rebateAmount}>- {formatCurrency(result.marginalRelief)}</Text>
                </View>
              )}

              {/* Cess */}
              <View style={styles.cessCard}>
                <Text style={styles.cessLabel}>Health & Education Cess (4%)</Text>
                <Text style={styles.cessAmount}>+ {formatCurrency(result.cess)}</Text>
              </View>
            </View>

            {/* Reset Button */}
            <TouchableOpacity style={styles.resetButton} onPress={resetCalculator}>
              <Text style={styles.resetButtonText}>Calculate Again</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {!result && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧮</Text>
            <Text style={styles.emptyText}>Ready to Calculate?</Text>
            <Text style={styles.emptySubtext}>
              Enter your income and click "Calculate My Tax"
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
                  <Text style={styles.historyAmount}>{formatCurrency(item.finalTax || 0)}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(item.createdAt).toLocaleString('en-IN')}
                  </Text>
                </View>
                <Text style={styles.historyMeta}>
                  {String(item.taxRegime || 'new').toUpperCase()} • {String(item.incomeType || 'salaried').toUpperCase()} • ₹{item.annualIncome}
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
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  helpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
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
  regimeContainer: {
    gap: 12,
  },
  regimeButton: {
    backgroundColor: colors.glass,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  regimeButtonActive: {
    backgroundColor: colors.glassStrong,
    borderColor: colors.accent,
  },
  regimeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  regimeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  regimeTextContainer: {
    flex: 1,
  },
  regimeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  regimeTextActive: {
    color: colors.accent,
  },
  regimeSubtext: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  deductionsSection: {
    backgroundColor: colors.glass,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  deductionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  deductionsSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  deductionItem: {
    marginBottom: 16,
  },
  deductionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  deductionHelp: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  calculateButton: {
    backgroundColor: colors.accent,
    paddingVertical: 18,
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
  calculateButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  calculateButtonIcon: {
    color: colors.background,
    fontSize: 20,
    marginLeft: 8,
    fontWeight: '700',
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
  finalTaxContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 2,
    borderBottomColor: colors.accentLight,
    marginBottom: 24,
  },
  finalTaxLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  finalTaxAmount: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.accent,
    marginBottom: 8,
  },
  finalTaxSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  breakdownSection: {
    marginBottom: 24,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  stepCard: {
    backgroundColor: colors.glass,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.glassStrong,
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
    marginRight: 12,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  stepAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
  deductionAmount: {
    color: colors.error,
  },
  slabsCard: {
    backgroundColor: colors.glass,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  slabsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  slabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slabLeft: {
    flex: 1,
  },
  slabRange: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  slabRate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  slabTax: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
  },
  slabDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  slabTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  slabTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
  rebateCard: {
    backgroundColor: colors.glassStrong,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rebateIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  rebateContent: {
    flex: 1,
  },
  rebateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 2,
  },
  rebateSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  rebateAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
  cessCard: {
    backgroundColor: colors.glass,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cessLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cessAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.warning,
  },
  resetButton: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
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
