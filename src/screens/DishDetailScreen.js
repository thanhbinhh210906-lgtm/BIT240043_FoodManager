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

  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;
  if (notFound) {
    return (
      <View style={styles.center}>
        <Text>{t('not_found')}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
          <Text style={{ color: '#2a7' }}>{t('cancel')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const prep = dish[f('PreparationTime')];
  const prepLabel = prep <= 15 ? t('quick') : t('regular');

  return (
    <ScrollView style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ padding: 12 }}>
        {images.length === 0 ? (
          <View style={[styles.img, styles.imgPlaceholder]}><Text>{t('no_data')}</Text></View>
        ) : (
          images.map((img) => (
            <Image key={String(img[f('ImageId')])} source={{ uri: img[f('ImageUrl')] }} style={styles.img} />
          ))
        )}
      </ScrollView>

      <View style={{ padding: 16 }}>
        <Text style={styles.title}>{dish[f('Name')]}</Text>
        <Text style={styles.meta}>{t('category')}: {category ? category[f('Name')] : '?'}</Text>
        <Text style={styles.meta}>{t('price')}: {dish[f('Price')].toLocaleString()} đ</Text>
        <Text style={styles.meta}>{t('prep_time')}: {prep} — {prepLabel}</Text>
        <Text style={styles.meta}>{t('available')}: {dish[f('IsAvailable')] ? 'ON' : 'OFF'}</Text>
        <Text style={styles.desc}>{dish[f('Description')]}</Text>

        <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('DishForm', { mode: 'edit', dishId })}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{t('edit')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  img: { width: 260, height: 180, borderRadius: 10, marginRight: 10, backgroundColor: '#eee' },
  imgPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800' },
  meta: { color: '#555', marginTop: 6 },
  desc: { marginTop: 12, color: '#333' },
  editBtn: { marginTop: 20, backgroundColor: '#2a7', padding: 14, borderRadius: 10, alignItems: 'center' },
});