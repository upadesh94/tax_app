import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Share,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const PROPERTY_IMAGES_KEY = 'property_images_map';

export default function PropertiesScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [taxDetails, setTaxDetails] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [propertyImages, setPropertyImages] = useState({});
  const [uploadingForId, setUploadingForId] = useState(null);

  const isMissingTableError = (error) => error?.code === 'PGRST205';

  useEffect(() => {
    loadSavedPropertyImages();
  }, []);

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      fetchTaxDetails(selectedProperty.id);
      fetchPaymentStatus(selectedProperty.id);
    }
  }, [selectedProperty]);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const propertiesData = data || [];
      setProperties(propertiesData);
      
      // Auto-select first property
      if (propertiesData.length > 0 && !selectedProperty) {
        setSelectedProperty(propertiesData[0]);
      }
    } catch (error) {
      if (isMissingTableError(error)) {
        const demoProperty = {
          id: 'DEMO-001',
          property_number: 'PROP-DEMO-001',
          location: 'Pune, Maharashtra',
          address: 'Baner Road, Pune',
          area: 1250,
          property_value: 6500000,
          tax_status: 'pending',
          created_at: new Date().toISOString(),
        };
        setProperties([demoProperty]);
        setSelectedProperty(demoProperty);
      } else {
        console.error('Error fetching properties:', error);
        setProperties([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSavedPropertyImages = async () => {
    try {
      const saved = await AsyncStorage.getItem(PROPERTY_IMAGES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setPropertyImages(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading property images:', error);
    }
  };

  const persistPropertyImage = async (propertyId, imageUri) => {
    try {
      const updated = {
        ...propertyImages,
        [propertyId]: imageUri,
      };
      setPropertyImages(updated);
      await AsyncStorage.setItem(PROPERTY_IMAGES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving property image:', error);
      Alert.alert('Save Failed', 'Unable to save selected image. Please try again.');
    }
  };

  const getPropertyImageUri = (property) => {
    return propertyImages[property.id] || property.image_url || null;
  };

  const handlePickPropertyImage = async (propertyId) => {
    try {
      setUploadingForId(propertyId);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Needed',
          'Please allow photo library access to upload property images.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const imageUri = result.assets[0].uri;
      if (imageUri) {
        await persistPropertyImage(propertyId, imageUri);
        Alert.alert('Image Updated', 'Property image has been updated successfully.');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Upload Failed', 'Unable to pick image right now.');
    } finally {
      setUploadingForId(null);
    }
  };

  const fetchTaxDetails = async (propertyId) => {
    try {
      const { data, error } = await supabase
        .from('taxes')
        .select('*')
        .eq('property_id', propertyId)
        .order('due_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setTaxDetails(data);
    } catch (error) {
      if (isMissingTableError(error)) {
        setTaxDetails({
          id: 'DEMO-TAX-001',
          amount: 28400,
          total_amount: 28400,
          penalty: 0,
          due_date: new Date().toISOString(),
          status: 'pending',
        });
      } else {
        console.error('Error fetching tax details:', error);
        setTaxDetails(null);
      }
    }
  };

  const fetchPaymentStatus = async (propertyId) => {
    try {
      const { data, error } = await supabase
        .from('taxes')
        .select('*, payments(*)')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Create payment status timeline
      const statuses = [
        {
          id: 1,
          label: 'Assessment Complete',
          status: data && data.length > 0 ? 'completed' : 'inactive',
          date: data && data.length > 0 ? new Date(data[0].created_at).toLocaleDateString() : null,
        },
        {
          id: 2,
          label: 'Documentation',
          status: data && data.length > 0 ? 'completed' : 'inactive',
          date: data && data.length > 0 ? new Date(data[0].created_at).toLocaleDateString() : null,
        },
        {
          id: 3,
          label: 'Awaiting Payment',
          status: data && data.length > 0 && data[0].status === 'pending' ? 'pending' : 
                  data && data.length > 0 && data[0].status === 'paid' ? 'completed' : 'inactive',
          date: data && data.length > 0 ? `Deadline: ${new Date(data[0].due_date).toLocaleDateString()}` : null,
        },
        {
          id: 4,
          label: 'Tax Status Review',
          status: data && data.length > 0 && data[0].status === 'paid' ? 'completed' : 'inactive',
          date: null,
        },
      ];

      setPaymentStatus(statuses);
    } catch (error) {
      if (isMissingTableError(error)) {
        setPaymentStatus([
          { id: 1, label: 'Assessment Complete', status: 'completed', date: new Date().toLocaleDateString() },
          { id: 2, label: 'Documentation', status: 'completed', date: new Date().toLocaleDateString() },
          { id: 3, label: 'Awaiting Payment', status: 'pending', date: 'Deadline: Pending setup' },
          { id: 4, label: 'Tax Status Review', status: 'inactive', date: null },
        ]);
      } else {
        console.error('Error fetching payment status:', error);
        setPaymentStatus([]);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProperties();
    if (selectedProperty) {
      await fetchTaxDetails(selectedProperty.id);
      await fetchPaymentStatus(selectedProperty.id);
    }
    setRefreshing(false);
  };

  const handleShare = async () => {
    if (!selectedProperty) return;

    try {
      await Share.share({
        message: `Property Details:\nID: ${selectedProperty.id}\nLocation: ${selectedProperty.location}\nArea: ${selectedProperty.area} sq.ft\nValue: ₹${selectedProperty.property_value?.toLocaleString('en-IN')}`,
        title: 'Property Details',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleProceedToPayment = () => {
    if (!selectedProperty || !taxDetails) {
      Alert.alert('No Tax Due', 'There are no pending taxes for this property.');
      return;
    }

    if (taxDetails.status === 'paid') {
      Alert.alert('Already Paid', 'Tax for this property has already been paid.');
      return;
    }

    // Navigate to payment screen with tax details
    navigation.navigate('Payments', {
      taxId: taxDetails.id,
      propertyId: selectedProperty.id,
      amount: Number(taxDetails.amount ?? taxDetails.total_amount) || 0,
    });
  };

  const calculateTotalDue = () => {
    if (!taxDetails) return 0;
    
    const baseAmount = Number(taxDetails.amount ?? taxDetails.total_amount) || 0;
    const penalty = taxDetails.penalty || 0;
    const surcharge = 70; // Service surcharge
    
    return baseAmount + penalty + surcharge;
  };

  const getVisibleProperties = () => {
    let list = [...properties];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((property) => {
        const id = String(property.id || '').toLowerCase();
        const propertyNumber = String(property.property_number || '').toLowerCase();
        const location = String(property.location || '').toLowerCase();
        const address = String(property.address || '').toLowerCase();
        return id.includes(q) || propertyNumber.includes(q) || location.includes(q) || address.includes(q);
      });
    }

    if (statusFilter !== 'all') {
      list = list.filter(
        (property) => String(property.tax_status || 'pending').toLowerCase() === statusFilter
      );
    }

    if (sortBy === 'name') {
      list.sort((a, b) => String(a.location || '').localeCompare(String(b.location || '')));
    } else if (sortBy === 'value') {
      list.sort((a, b) => Number(b.property_value || 0) - Number(a.property_value || 0));
    } else {
      list.sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    }

    return list;
  };

  const renderPropertyCard = (property) => (
    <TouchableOpacity
      key={property.id}
      style={[
        styles.propertyCard,
        selectedProperty?.id === property.id && styles.propertyCardSelected
      ]}
      onPress={() => setSelectedProperty(property)}
    >
      <View style={styles.propertyImageContainer}>
        <View style={styles.propertyImage}>
          {getPropertyImageUri(property) ? (
            <Image
              source={{ uri: getPropertyImageUri(property) }}
              style={styles.propertyImageActual}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.propertyImagePlaceholder}>🏠</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => handlePickPropertyImage(property.id)}
          disabled={uploadingForId === property.id}
        >
          <Text style={styles.uploadIcon}>{uploadingForId === property.id ? '…' : '📷'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareIcon}>↗</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.propertyInfo}>
        <Text style={styles.propertyName}>{property.location || 'Property'}</Text>
        <Text style={styles.propertyAddress}>📍 {property.address || property.location}</Text>
        
        <View style={styles.propertyStats}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>ID</Text>
            <Text style={styles.statValue}>{property.id}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>AREA</Text>
            <Text style={styles.statValue}>{property.area || 0} sq.ft</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>VALUE</Text>
            <Text style={styles.statValue}>₹{(property.property_value || 0).toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    const styles = createStyles(colors);
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading properties...</Text>
      </View>
    );
  }

  const styles = createStyles(colors);
  const visibleProperties = getVisibleProperties();

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
          <Text style={styles.headerTitle}>Properties</Text>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.controlsContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by address or property ID"
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.controlRow}>
          {['all', 'paid', 'pending'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.controlChip,
                statusFilter === option && styles.controlChipActive,
              ]}
              onPress={() => setStatusFilter(option)}
            >
              <Text
                style={[
                  styles.controlChipText,
                  statusFilter === option && styles.controlChipTextActive,
                ]}
              >
                {option.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.controlRow}>
          {['date', 'value', 'name'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.controlChip,
                sortBy === option && styles.controlChipActive,
              ]}
              onPress={() => setSortBy(option)}
            >
              <Text
                style={[
                  styles.controlChipText,
                  sortBy === option && styles.controlChipTextActive,
                ]}
              >
                Sort: {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {visibleProperties.length > 0 ? (
        <>
          {visibleProperties.map(property => renderPropertyCard(property))}

          {selectedProperty && taxDetails && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Financial Breakdown</Text>
                
                <View style={styles.breakdownCard}>
                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownIcon}>
                      <Text style={styles.breakdownIconText}>💰</Text>
                    </View>
                    <View style={styles.breakdownInfo}>
                      <Text style={styles.breakdownLabel}>Base Annual Tax</Text>
                      <Text style={styles.breakdownValue}>
                        ₹{(taxDetails.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>

                  {taxDetails.penalty > 0 && (
                    <View style={[styles.breakdownRow, styles.breakdownRowDanger]}>
                      <View style={[styles.breakdownIcon, styles.breakdownIconDanger]}>
                        <Text style={styles.breakdownIconText}>⚠️</Text>
                      </View>
                      <View style={styles.breakdownInfo}>
                        <Text style={styles.breakdownLabel}>Late Penalties</Text>
                        <Text style={styles.breakdownSubtext}>
                          Overdue by {Math.floor((new Date() - new Date(taxDetails.due_date)) / (1000 * 60 * 60 * 24))} days
                        </Text>
                        <Text style={[styles.breakdownValue, styles.breakdownValueDanger]}>
                          +₹{(taxDetails.penalty || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownIcon}>
                      <Text style={styles.breakdownIconText}>🏛️</Text>
                    </View>
                    <View style={styles.breakdownInfo}>
                      <Text style={styles.breakdownLabel}>Service Surcharge</Text>
                      <Text style={styles.breakdownValue}>₹70.00</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.totalCard}>
                  <Text style={styles.totalLabel}>TOTAL AMOUNT DUE</Text>
                  <Text style={styles.totalAmount}>
                    ₹{calculateTotalDue().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Payment Status</Text>
                
                <View style={styles.statusCard}>
                  {paymentStatus.map((status) => (
                    <View key={status.id} style={styles.statusItem}>
                      <View style={
                        status.status === 'completed' ? styles.statusIconSuccess :
                        status.status === 'pending' ? styles.statusIconPending :
                        styles.statusIconInactive
                      }>
                        <Text style={styles.statusIconText}>
                          {status.status === 'completed' ? '✓' : 
                           status.status === 'pending' ? '⏱' : '○'}
                        </Text>
                      </View>
                      <View style={styles.statusInfo}>
                        <Text style={styles.statusLabel}>{status.label}</Text>
                        {status.date && (
                          <Text style={styles.statusDate}>{status.date}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              <TouchableOpacity 
                style={[
                  styles.paymentButton,
                  taxDetails.status === 'paid' && styles.paymentButtonDisabled
                ]}
                onPress={handleProceedToPayment}
                disabled={taxDetails.status === 'paid'}
              >
                <Text style={styles.paymentButtonText}>
                  {taxDetails.status === 'paid' ? 'Already Paid' : 'Proceed to Payment'}
                </Text>
                {taxDetails.status !== 'paid' && (
                  <Text style={styles.paymentButtonArrow}>→</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {selectedProperty && !taxDetails && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No Tax Records</Text>
              <Text style={styles.emptySubtext}>
                No tax information available for this property
              </Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏠</Text>
          <Text style={styles.emptyText}>No Matching Properties</Text>
          <Text style={styles.emptySubtext}>
            Try changing your search or filters
          </Text>
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
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
  header: {
    backgroundColor: colors.headerBackground,
    padding: 20,
    paddingTop: 50,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  controlsContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchInput: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  controlRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  controlChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  controlChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '20',
  },
  controlChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  controlChipTextActive: {
    color: colors.accent,
  },
  propertyCard: {
    margin: 20,
    marginBottom: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  propertyCardSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  propertyImageContainer: {
    height: 200,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  propertyImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyImageActual: {
    width: '100%',
    height: '100%',
  },
  propertyImagePlaceholder: {
    fontSize: 64,
  },
  uploadButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadIcon: {
    fontSize: 17,
  },
  shareButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareIcon: {
    fontSize: 18,
    color: colors.textPrimary,
  },
  propertyInfo: {
    padding: 20,
  },
  propertyName: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  propertyAddress: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 20,
  },
  propertyStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.border,
    padding: 12,
    borderRadius: 8,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  breakdownCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  breakdownRowDanger: {
    backgroundColor: colors.error + '20',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderBottomColor: colors.error + '30',
  },
  breakdownIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.info + '40',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  breakdownIconDanger: {
    backgroundColor: colors.error + '40',
  },
  breakdownIconText: {
    fontSize: 18,
  },
  breakdownInfo: {
    flex: 1,
  },
  breakdownLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  breakdownSubtext: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  breakdownValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  breakdownValueDanger: {
    color: colors.error,
  },
  totalCard: {
    backgroundColor: colors.info + '40',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  totalLabel: {
    color: colors.info,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  totalAmount: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
  },
  statusCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statusIconSuccess: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.success + '40',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusIconPending: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.warning + '40',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusIconInactive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusIconText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusDate: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  paymentButton: {
    backgroundColor: colors.info + '40',
    marginHorizontal: 20,
    marginBottom: 24,
    paddingVertical: 18,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  paymentButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  paymentButtonArrow: {
    color: colors.textPrimary,
    fontSize: 18,
    marginLeft: 8,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 16,
  },
});
