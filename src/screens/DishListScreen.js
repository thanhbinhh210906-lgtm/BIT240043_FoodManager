// MSSV: BIT240043
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator, TextInput, ScrollView, Modal } from 'react-native';
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

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState(null);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortType, setSortType] = useState('none');

  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Hàm tải dữ liệu: Ưu tiên lấy từ API, nếu lỗi thì lấy từ bộ nhớ máy
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Gọi API lấy dữ liệu từ MockAPI
      const response = await fetch('https://6ad71c60f71f154ac487cab2.mockapi.io/BIT240043_Dish');
      if (!response.ok) throw new Error('Network response was not ok');
      const apiData = await response.json();

      // 2. Chuyển đổi dữ liệu từ API sang chuẩn của App
      const parsedDishes = apiData.map(item => ({
        [f('DishId')]: item.BIT240043_Id,
        [f('Name')]: item.BIT240043_Name,
        [f('Price')]: item.BIT240043_Price,
        [f('PreparationTime')]: item.BIT240043_PreparationTime,
        [f('IsAvailable')]: item.BIT240043_IsAvailable,
        [f('Description')]: item.BIT240043_Description,
        [f('DishCategoryId')]: item.BIT240043_DishCategoryId,
      }));

      // 3. Tạo dữ liệu ảnh tự động từ link ảnh trên API (Vì MockAPI của bạn đang lưu ảnh dạng chuỗi)
      const parsedImages = apiData.map((item, index) => ({
        [f('ImageId')]: Date.now() + index,
        [f('ImageUrl')]: item.BIT240043_DishImage,
        [f('IsThumbnail')]: true,
        [f('DishId')]: item.BIT240043_Id,
      }));

      // 4. Lưu đè vào bộ nhớ máy (AsyncStorage) để dùng khi Offline
      await saveDishes(parsedDishes);
      await saveImages(parsedImages);

      // 5. Cập nhật giao diện
      setDishes(parsedDishes);
      setImages(parsedImages);

    } catch (error) {
      console.log('Lỗi tải API, chuyển sang dùng dữ liệu Offline:', error);
      // NẾU MẤT MẠNG: Lấy dữ liệu đang lưu trong máy ra hiển thị
      const [d, i] = await Promise.all([getDishes(), getImages()]);
      setDishes(d); setImages(i);
    }

    // Luôn lấy danh mục từ bộ nhớ máy
    const c = await getCategories();
    setCategories(c); 
    setLoading(false);
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

  const handleDeleteClick = (dishId) => {
    setDeleteId(dishId);
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    try {
      const updated = dishes.filter((x) => x[f('DishId')] !== deleteId);
      await saveDishes(updated);
      const imgs = await getImages();
      await saveImages(imgs.filter((i) => i[f('DishId')] !== deleteId));
      await addPendingSync('DELETE', { [f('DishId')]: deleteId });
      
      setShowDeleteConfirm(false);
      setDeleteId(null);
      load();
    } catch (e) {}
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

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.langBtn} onPress={() => changeLanguage(lang === 'en' ? 'vi' : 'en')}>
          <Text style={styles.langText}>{lang === 'en' ? '🌐 EN' : '🌐 VI'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterPanel}>
        <TextInput style={styles.input} placeholder={t('search_placeholder')} value={search} onChangeText={setSearch} placeholderTextColor="#999" />
        <Text style={styles.filterLabel}>{t('category')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity style={[styles.chip, selectedCat === null && styles.chipActive]} onPress={() => setSelectedCat(null)}>
            <Text style={{ color: selectedCat === null ? '#fff' : '#555', fontWeight: '500' }}>{t('all_categories')}</Text>
          </TouchableOpacity>
          {categories.map((c) => {
            const cid = c[f('DishCategoryId')];
            const active = selectedCat === cid;
            return (
              <TouchableOpacity key={cid} style={[styles.chip, active && styles.chipActive]} onPress={() => setSelectedCat(cid)}>
                <Text style={{ color: active ? '#fff' : '#555', fontWeight: '500' }}>{catName(cid)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          <TextInput style={[styles.input, { flex: 1, marginRight: 10, marginBottom: 0 }]} placeholder={t('price_min')} keyboardType="numeric" value={minPrice} onChangeText={setMinPrice} placeholderTextColor="#999" />
          <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder={t('price_max')} keyboardType="numeric" value={maxPrice} onChangeText={setMaxPrice} placeholderTextColor="#999" />
        </View>
        {isPriceRangeInvalid ? <Text style={styles.errorText}>{t('invalid_price_range')}</Text> : null}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setOnlyAvailable(!onlyAvailable)} style={styles.checkboxRow}>
            <View style={[styles.checkbox, onlyAvailable && styles.checkboxActive]} />
            <Text style={{ marginLeft: 6, color: '#333' }}>{t('available')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearFilters}>
            <Text style={{ color: '#FF3B30', fontWeight: '500' }}>{t('clear_filters')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.filterLabel}>{t('filter_sort')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {['price_asc', 'price_desc', 'prep_asc'].map((s) => (
            <TouchableOpacity key={s} style={[styles.chip, sortType === s && styles.chipActive, { marginBottom: 8 }]} onPress={() => setSortType(s)}>
              <Text style={{ color: sortType === s ? '#fff' : '#555', fontSize: 12, fontWeight: '500' }}>{t(`sort_${s}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredDishes}
        keyExtractor={(item) => String(item[f('DishId')])}
        ListEmptyComponent={<Text style={styles.empty}>{t('no_data')}</Text>}
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        renderItem={({ item }) => {
          const thumb = thumbOf(item[f('DishId')]);
          const prep = item[f('PreparationTime')];
          const prepLabel = prep <= 15 ? t('quick') : t('regular');
          return (
            <View style={styles.cardWrapper}>
              <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('DishDetail', { dishId: item[f('DishId')] })}>
                {thumb ? (
                  <Image source={{ uri: thumb[f('ImageUrl')] }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={{ color: '#ccc' }}>No Image</Text>
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.name}>{item[f('Name')]}</Text>
                  <Text style={styles.meta}>{catName(item[f('DishCategoryId')])}</Text>
                  <Text style={styles.priceText}>{`${item[f('Price')].toLocaleString()} VND - ${prepLabel}`}</Text>
                  {!item[f('IsAvailable')] && (
                    <Text style={styles.unavailable}>{`● ${t('available')}: OFF`}</Text>
                  )}
                </View>
              </TouchableOpacity>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('DishForm', { mode: 'edit', dishId: item[f('DishId')] })}>
                  <Text style={styles.actionText}>{t('edit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteClick(item[f('DishId')])}>
                  <Text style={[styles.actionText, { color: '#FF3B30' }]}>{t('delete')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('DishForm', { mode: 'create' })}>
        <Text style={styles.fabText}>+ {t('add_button')}</Text>
      </TouchableOpacity>

      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' }}>{t('confirm_delete')}</Text>
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#F2F2F7', marginRight: 10 }]} onPress={() => setShowDeleteConfirm(false)}>
                <Text style={{ color: '#333', fontWeight: '600' }}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#FF3B30' }]} onPress={executeDelete}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E5E5EA' },
  langBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#F2F2F7', borderRadius: 8 },
  langText: { fontWeight: '600', color: '#007AFF' },
  filterPanel: { backgroundColor: '#FFFFFF', padding: 16, borderBottomWidth: 1, borderColor: '#E5E5EA' },
  input: { borderWidth: 1, borderColor: '#D1D1D6', borderRadius: 10, padding: 10, marginBottom: 8, backgroundColor: '#FAFAFA', color: '#333' },
  filterLabel: { fontWeight: '700', marginTop: 8, marginBottom: 8, fontSize: 13, color: '#8E8E93', textTransform: 'uppercase' },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F2F2F7', marginRight: 8 },
  chipActive: { backgroundColor: '#007AFF' },
  errorText: { color: '#FF3B30', fontSize: 12, marginTop: 4, fontWeight: '500' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 22, height: 22, borderWidth: 1.5, borderColor: '#D1D1D6', borderRadius: 6, backgroundColor: '#FFF' },
  checkboxActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  cardWrapper: { backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  card: { flexDirection: 'row', padding: 12, alignItems: 'center' },
  actionButtons: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderColor: '#F2F2F7', padding: 8, backgroundColor: '#FFFFFF' },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6 },
  actionText: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
  thumb: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#F2F2F7' },
  thumbPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  meta: { color: '#8E8E93', marginTop: 4, fontSize: 13 },
  priceText: { color: '#34C759', marginTop: 6, fontSize: 14, fontWeight: '600' },
  unavailable: { color: '#FF3B30', marginTop: 6, fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, color: '#8E8E93', fontSize: 15 },
  fab: { position: 'absolute', right: 20, bottom: 24, backgroundColor: '#007AFF', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 30, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 16, width: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  modalBtn: { padding: 12, borderRadius: 10, flex: 1, alignItems: 'center' }
});
