// MSSV: BIT240043
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator, TextInput, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { getDishes, getCategories, getImages, saveDishes, saveImages, addPendingSync } from '../services/storage';
import { f } from '../models/models';
import { useApp } from '../context/AppContext';

export default function DishListScreen({ navigation }) {
  const { t } = useTranslation();
  const { lang, changeLanguage } = useApp();
  
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState(null);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortType, setSortType] = useState('none');
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [d, c, i] = await Promise.all([getDishes(), getCategories(), getImages()]);
    setDishes(d); setCategories(c); setImages(i); setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const thumbOf = (dishId) =>
    images.find((img) => img[f('DishId')] === dishId && img[f('IsThumbnail')]) ||
    images.find((img) => img[f('DishId')] === dishId);

  const catName = (catId) => {
    if (catId === 1) return t('cat_main');
    if (catId === 2) return t('cat_drink');
    if (catId === 3) return t('cat_dessert');
    const c = categories.find((x) => x[f('DishCategoryId')] === catId);
    return c ? c[f('Name')] : '?';
  };

  const handleDelete = (dishId) => {
    Alert.alert(
      t('confirm_delete'),
      '',
      [
        { text: t('no'), style: 'cancel' },
        {
          text: t('yes'),
          style: 'destructive',
          onPress: async () => {
            const updated = dishes.filter((x) => x[f('DishId')] !== dishId);
            await saveDishes(updated);
            const imgs = await getImages();
            await saveImages(imgs.filter((i) => i[f('DishId')] !== dishId));
            await addPendingSync('DELETE', { [f('DishId')]: dishId });
            load();
          },
        },
      ]
    );
  };

  const filteredDishes = useMemo(() => {
    let result = [...dishes];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((d) => d[f('Name')].toLowerCase().includes(q));
    }
    if (selectedCat !== null) {
      result = result.filter((d) => d[f('DishCategoryId')] === selectedCat);
    }
    if (onlyAvailable) {
      result = result.filter((d) => d[f('IsAvailable')] === true);
    }
    
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    if (min !== null && max !== null && min > max) return []; 
    if (min !== null) result = result.filter((d) => d[f('Price')] >= min);
    if (max !== null) result = result.filter((d) => d[f('Price')] <= max);

    if (sortType === 'price_asc') result.sort((a, b) => a[f('Price')] - b[f('Price')]);
    if (sortType === 'price_desc') result.sort((a, b) => b[f('Price')] - a[f('Price')]);
    if (sortType === 'prep_asc') result.sort((a, b) => a[f('PreparationTime')] - b[f('PreparationTime')]);

    return result;
  }, [dishes, search, selectedCat, onlyAvailable, minPrice, maxPrice, sortType]);

  const isPriceRangeInvalid = minPrice && maxPrice && Number(minPrice) > Number(maxPrice);

  const clearFilters = () => {
    setSearch(''); setSelectedCat(null); setOnlyAvailable(false);
    setMinPrice(''); setMaxPrice(''); setSortType('none');
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setShowFilters(!showFilters)}>
          <Text style={styles.iconText}>⚙️ {t('filter_sort')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.langBtn} onPress={() => changeLanguage(lang === 'en' ? 'vi' : 'en')}>
          <Text style={styles.langText}>{lang === 'en' ? '🌐 EN' : '🌐 VI'}</Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filterPanel}>
          <TextInput style={styles.input} placeholder={t('search_placeholder')} value={search} onChangeText={setSearch} />
          
          <Text style={styles.filterLabel}>{t('category')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity style={[styles.chip, selectedCat === null && styles.chipActive]} onPress={() => setSelectedCat(null)}>
              <Text style={{ color: selectedCat === null ? '#fff' : '#333' }}>{t('all_categories')}</Text>
            </TouchableOpacity>
            {categories.map((c) => {
              const cid = c[f('DishCategoryId')];
              const active = selectedCat === cid;
              return (
                <TouchableOpacity key={cid} style={[styles.chip, active && styles.chipActive]} onPress={() => setSelectedCat(cid)}>
                  <Text style={{ color: active ? '#fff' : '#333' }}>{catName(cid)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder={t('price_min')} keyboardType="numeric" value={minPrice} onChangeText={setMinPrice} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder={t('price_max')} keyboardType="numeric" value={maxPrice} onChangeText={setMaxPrice} />
          </View>
          {isPriceRangeInvalid && <Text style={styles.errorText}>{t('invalid_price_range')}</Text>}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setOnlyAvailable(!onlyAvailable)} style={styles.checkboxRow}>
              <View style={[styles.checkbox, onlyAvailable && styles.checkboxActive]} />
              <Text style={{ marginLeft: 6 }}>{t('available')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearFilters}><Text style={{ color: '#e33' }}>{t('clear_filters')}</Text></TouchableOpacity>
          </View>

          <Text style={styles.filterLabel}>{t('filter_sort')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['price_asc', 'price_desc', 'prep_asc'].map((s) => (
              <TouchableOpacity key={s} style={[styles.chip, sortType === s && styles.chipActive]} onPress={() => setSortType(s)}>
                <Text style={{ color: sortType === s ? '#fff' : '#333', fontSize: 12 }}>{t(`sort_${s}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <FlatList
        data={filteredDishes}
        keyExtractor={(item) => String(item[f('DishId')])}
        ListEmptyComponent={<Text style={styles.empty}>{t('no_data')}</Text>}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => {
          const thumb = thumbOf(item[f('DishId')]);
          const prep = item[f('PreparationTime')];
          const prepLabel = prep <= 15 ? t('quick') : t('regular');
          return (
            <View style={styles.cardWrapper}>
              <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('DishDetail', { dishId: item[f('DishId')] })}>
                {thumb ? <Image source={{ uri: thumb[f('ImageUrl')] }} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbPlaceholder]} />}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.name}>{item[f('Name')]}</Text>
                  <Text style={styles.meta}>{catName(item[f('DishCategoryId')])}</Text>
                  <Text style={styles.meta}>{item[f('Price')].toLocaleString()} đ · {prepLabel}</Text>
                  {!item[f('IsAvailable')] && <Text style={styles.unavailable}>● {t('available')}: OFF</Text>}
                </View>
              </TouchableOpacity>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('DishForm', { mode: 'edit', dishId: item[f('DishId')] })}>
                  <Text style={styles.actionText}>{t('edit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item[f('DishId')])}>
                  <Text style={[styles.actionText, { color: '#e33' }]}>{t('delete')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('DishForm', { mode: 'create' })}>
        <Text style={styles.fabText}>+ {t('add_button')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  iconBtn: { padding: 8, backgroundColor: '#f0f0f0', borderRadius: 6 },
  iconText: { fontWeight: '600' },
  langBtn: { padding: 8, backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#ddd' },
  langText: { fontWeight: '600' },
  filterPanel: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 8, backgroundColor: '#fafafa' },
  filterLabel: { fontWeight: '600', marginTop: 8, marginBottom: 4, fontSize: 12 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#eee', marginRight: 8 },
  chipActive: { backgroundColor: '#2a7' },
  errorText: { color: '#e33', fontSize: 12, marginTop: 4 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 20, height: 20, borderWidth: 1, borderColor: '#ccc', borderRadius: 4 },
  checkboxActive: { backgroundColor: '#2a7', borderColor: '#2a7' },
  cardWrapper: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 10, elevation: 2, overflow: 'hidden' },
  card: { flexDirection: 'row', padding: 10, alignItems: 'center' },
  actionButtons: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderColor: '#eee', padding: 6, backgroundColor: '#fafafa' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 4 },
  actionText: { fontSize: 13, fontWeight: '600', color: '#555' },
  thumb: { width: 70, height: 70, borderRadius: 8, backgroundColor: '#eee' },
  thumbPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { color: '#666', marginTop: 2 },
  unavailable: { color: '#c00', marginTop: 2, fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 30, color: '#888' },
  fab: { position: 'absolute', right: 16, bottom: 20, backgroundColor: '#2a7', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 24, elevation: 4 },
  fabText: { color: '#fff', fontWeight: '700' },
});
