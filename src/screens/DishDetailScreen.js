// MSSV: BIT240043
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getDishes, getCategories, getImages } from '../services/storage';
import { f } from '../models/models';

export default function DishDetailScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { dishId } = route.params;
  const [dish, setDish] = useState(null);
  const [category, setCategory] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const [ds, cs, imgs] = await Promise.all([getDishes(), getCategories(), getImages()]);
      const found = ds.find((x) => x[f('DishId')] === dishId);
      if (!found) { setNotFound(true); setLoading(false); return; }
      setDish(found);
      setCategory(cs.find((c) => c[f('DishCategoryId')] === found[f('DishCategoryId')]));
      setImages(imgs.filter((i) => i[f('DishId')] === dishId));
      setLoading(false);
    })();
  }, [dishId]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;
  
  if (notFound) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 16, color: '#8E8E93', marginBottom: 12 }}>{t('not_found')}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10 }}>
          <Text style={{ color: '#007AFF', fontWeight: '600' }}>{t('cancel')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const prep = dish[f('PreparationTime')];
  const prepLabel = prep <= 15 ? t('quick') : t('regular');

  // Xử lý tên danh mục (dịch nếu là danh mục mặc định)
  const catId = dish[f('DishCategoryId')];
  const catNameStr = catId === 1 ? t('cat_main') : catId === 2 ? t('cat_drink') : catId === 3 ? t('cat_dessert') : (category ? category[f('Name')] : '?');

  return (
    <ScrollView style={styles.container}>
      {/* Phần ảnh trượt ngang */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ padding: 12 }} contentContainerStyle={{ paddingRight: 12 }}>
        {images.length === 0 ? (
          <View style={[styles.img, styles.imgPlaceholder]}>
            <Text style={{ color: '#8E8E93' }}>{t('no_data')}</Text>
          </View>
        ) : (
          images.map((img) => (
            <Image key={String(img[f('ImageId')])} source={{ uri: img[f('ImageUrl')] }} style={styles.img} />
          ))
        )}
      </ScrollView>

      {/* Phần thông tin chi tiết */}
      <View style={styles.infoContainer}>
        <Text style={styles.title}>{dish[f('Name')]}</Text>
        
        <View style={styles.row}>
          <Text style={styles.label}>{t('category')}:</Text>
          <Text style={styles.value}>{catNameStr}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>{t('price')}:</Text>
          <Text style={[styles.value, { color: '#34C759', fontWeight: '700' }]}>
            {dish[f('Price')].toLocaleString()} VND
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>{t('prep_time')}:</Text>
          <Text style={styles.value}>{prep} - {prepLabel}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>{t('available')}:</Text>
          <Text style={[styles.value, { color: dish[f('IsAvailable')] ? '#34C759' : '#FF3B30', fontWeight: '600' }]}>
            {dish[f('IsAvailable')] ? 'ON' : 'OFF'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{t('description')}</Text>
        <Text style={styles.desc}>{dish[f('Description')] || '---'}</Text>

        <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('DishForm', { mode: 'edit', dishId })}>
          <Text style={styles.editBtnText}>{t('edit')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' },
  
  img: { width: 280, height: 200, borderRadius: 16, marginRight: 12, backgroundColor: '#E5E5EA' },
  imgPlaceholder: { justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D1D1D6', borderStyle: 'dashed' },
  
  infoContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, minHeight: 400, marginTop: -10 },
  title: { fontSize: 24, fontWeight: '800', color: '#1C1C1E', marginBottom: 16 },
  
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 15, color: '#8E8E93', width: 100 },
  value: { fontSize: 15, color: '#333', fontWeight: '500', flex: 1 },
  
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginTop: 20, marginBottom: 8 },
  desc: { fontSize: 15, color: '#555', lineHeight: 22, backgroundColor: '#F2F2F7', padding: 12, borderRadius: 10 },
  
  editBtn: { marginTop: 30, backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center' },
  editBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
