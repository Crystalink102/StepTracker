import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import * as ActivityService from '@/src/services/activity.service';
import { Gear } from '@/src/types/database';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

export default function GearScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [gear, setGear] = useState<Gear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formType, setFormType] = useState<string>('shoes');
  const [formMaxDist, setFormMaxDist] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadGear = useCallback(async () => {
    if (!user) return;
    try {
      const list = await ActivityService.getGearList(user.id);
      setGear(list);
    } catch (err) {
      console.warn('[Gear] Load failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadGear();
  }, [loadGear]);

  const resetForm = () => {
    setFormName('');
    setFormBrand('');
    setFormType('shoes');
    setFormMaxDist('');
    setShowAdd(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!user || !formName.trim() || isSaving) return;
    setIsSaving(true);

    const maxDist = formMaxDist ? parseFloat(formMaxDist) * 1000 : undefined;

    try {
      if (editingId) {
        await ActivityService.updateGear(editingId, {
          name: formName.trim(),
          brand: formBrand.trim() || undefined,
          type: formType,
          max_distance_meters: maxDist ?? null,
        });
      } else {
        await ActivityService.createGear(user.id, {
          name: formName.trim(),
          brand: formBrand.trim() || undefined,
          type: formType,
          max_distance_meters: maxDist,
        });
      }
      resetForm();
      await loadGear();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save gear');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: Gear) => {
    setEditingId(item.id);
    setFormName(item.name);
    setFormBrand(item.brand || '');
    setFormType(item.type);
    setFormMaxDist(item.max_distance_meters ? String(item.max_distance_meters / 1000) : '');
    setShowAdd(true);
  };

  const handleRetire = async (item: Gear) => {
    try {
      await ActivityService.updateGear(item.id, { is_retired: !item.is_retired });
      await loadGear();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update gear');
    }
  };

  const handleSetDefault = async (item: Gear) => {
    try {
      // Clear any existing default first
      for (const g of gear) {
        if (g.is_default && g.id !== item.id) {
          await ActivityService.updateGear(g.id, { is_default: false });
        }
      }
      await ActivityService.updateGear(item.id, { is_default: !item.is_default });
      await loadGear();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to set default');
    }
  };

  const handleDelete = (item: Gear) => {
    Alert.alert(
      'Delete Gear',
      `Are you sure you want to delete "${item.name}"? Activities using this gear will be unlinked.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ActivityService.deleteGear(item.id);
              await loadGear();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete gear');
            }
          },
        },
      ]
    );
  };

  const gearIcon = (type: string) => {
    if (type === 'shoes') return 'footsteps-outline' as const;
    if (type === 'watch') return 'watch-outline' as const;
    return 'fitness-outline' as const;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Track mileage on your shoes and gear to know when they need replacing.
      </Text>

      {/* Add/Edit Form */}
      {showAdd ? (
        <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.formTitle, { color: colors.textPrimary }]}>
            {editingId ? 'Edit Gear' : 'Add Gear'}
          </Text>

          <Text style={[styles.label, { color: colors.textMuted }]}>NAME</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surfaceLight }]}
            value={formName}
            onChangeText={setFormName}
            placeholder="e.g., Nike Pegasus 40"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={[styles.label, { color: colors.textMuted }]}>BRAND (optional)</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surfaceLight }]}
            value={formBrand}
            onChangeText={setFormBrand}
            placeholder="e.g., Nike"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={[styles.label, { color: colors.textMuted }]}>TYPE</Text>
          <View style={styles.typeRow}>
            {['shoes', 'watch', 'other'].map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeChip,
                  { backgroundColor: colors.surfaceLight },
                  formType === t && { backgroundColor: Colors.primary },
                ]}
                onPress={() => setFormType(t)}
              >
                <Ionicons name={gearIcon(t)} size={16} color={formType === t ? '#FFF' : colors.textMuted} />
                <Text style={[styles.typeChipText, { color: colors.textSecondary }, formType === t && { color: '#FFF' }]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.textMuted }]}>RETIREMENT DISTANCE (km, optional)</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surfaceLight }]}
            value={formMaxDist}
            onChangeText={setFormMaxDist}
            placeholder="e.g., 800"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />

          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
              <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, !formName.trim() && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={!formName.trim() || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>{editingId ? 'Update' : 'Add'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.surface }]}
          onPress={() => setShowAdd(true)}
        >
          <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.addButtonText}>Add Gear</Text>
        </TouchableOpacity>
      )}

      {/* Gear List */}
      {gear.map((item) => {
        const distKm = item.distance_meters / 1000;
        const maxKm = item.max_distance_meters ? item.max_distance_meters / 1000 : null;
        const wearPct = maxKm ? Math.min(100, (distKm / maxKm) * 100) : null;
        const isWorn = wearPct != null && wearPct >= 80;

        return (
          <View
            key={item.id}
            style={[
              styles.gearCard,
              { backgroundColor: colors.surface },
              item.is_retired && { opacity: 0.6 },
            ]}
          >
            <View style={styles.gearHeader}>
              <Ionicons name={gearIcon(item.type)} size={24} color={item.is_retired ? colors.textMuted : Colors.primary} />
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Text style={[styles.gearName, { color: colors.textPrimary }]}>{item.name}</Text>
                  {item.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                  {item.is_retired && (
                    <View style={[styles.defaultBadge, { backgroundColor: colors.textMuted }]}>
                      <Text style={styles.defaultBadgeText}>Retired</Text>
                    </View>
                  )}
                </View>
                {item.brand && (
                  <Text style={[styles.gearBrand, { color: colors.textMuted }]}>{item.brand}</Text>
                )}
              </View>
            </View>

            {/* Mileage bar */}
            <View style={styles.mileageSection}>
              <View style={styles.mileageHeader}>
                <Text style={[styles.mileageText, { color: colors.textSecondary }]}>
                  {distKm.toFixed(0)} km
                </Text>
                {maxKm && (
                  <Text style={[styles.mileageText, { color: isWorn ? colors.danger : colors.textMuted }]}>
                    / {maxKm.toFixed(0)} km
                  </Text>
                )}
              </View>
              {maxKm && (
                <View style={[styles.mileageBarBg, { backgroundColor: colors.surfaceLight }]}>
                  <View
                    style={[
                      styles.mileageBarFill,
                      {
                        width: `${wearPct ?? 0}%`,
                        backgroundColor: isWorn ? colors.danger : Colors.primary,
                      },
                    ]}
                  />
                </View>
              )}
            </View>

            {/* Actions */}
            <View style={styles.gearActions}>
              <TouchableOpacity style={styles.gearActionBtn} onPress={() => handleSetDefault(item)}>
                <Ionicons
                  name={item.is_default ? 'checkmark-circle' : 'checkmark-circle-outline'}
                  size={18}
                  color={item.is_default ? Colors.primary : colors.textMuted}
                />
                <Text style={[styles.gearActionText, { color: colors.textMuted }]}>
                  {item.is_default ? 'Default' : 'Set Default'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gearActionBtn} onPress={() => handleRetire(item)}>
                <Ionicons name="archive-outline" size={18} color={colors.textMuted} />
                <Text style={[styles.gearActionText, { color: colors.textMuted }]}>
                  {item.is_retired ? 'Unretire' : 'Retire'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gearActionBtn} onPress={() => handleEdit(item)}>
                <Ionicons name="pencil-outline" size={18} color={colors.textMuted} />
                <Text style={[styles.gearActionText, { color: colors.textMuted }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gearActionBtn} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                <Text style={[styles.gearActionText, { color: colors.danger }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {gear.length === 0 && !showAdd && (
        <View style={styles.emptyState}>
          <Ionicons name="footsteps-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No Gear Added</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Track the mileage on your shoes to know when they need replacing
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  subtitle: {
    fontSize: FontSize.md,
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  addButtonText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  formCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  formTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  input: {
    fontSize: FontSize.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  typeChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  cancelBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  cancelBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  gearCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  gearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gearName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  gearBrand: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  defaultBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  mileageSection: {
    marginTop: Spacing.md,
  },
  mileageHeader: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  mileageText: {
    fontSize: FontSize.sm,
  },
  mileageBarBg: {
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  mileageBarFill: {
    height: 6,
    borderRadius: BorderRadius.full,
  },
  gearActions: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.lg,
  },
  gearActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gearActionText: {
    fontSize: FontSize.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    paddingHorizontal: Spacing.xxl,
  },
});
