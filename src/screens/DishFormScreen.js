// MSSV: BIT240043
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch, Alert, Image, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getCategories, getDishes, saveDishes, nextId, getImages, saveImages, addPendingSync } from '../services/storage';
import { f, STORAGE_KEYS } from '../models/models';
import { validateDish } from '../utils/validation';

export default function DishFormScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { mode, dishId } = route.params || { mode: 'create' };
  const isEdit = mode === 'edit';

  const [categories, setCategories] = useState([]);
  const [allDishes, setAllDishes] = useState([]);
  const [form, setForm] = useState({
    [f('DishId')]: null,
    [f('Name')]: '',
    [f('Price')]: '',
    [f('PreparationTime')]: '',
    [f('IsAvailable')]: true,
    [f('Description')]: '',
    [f('DishCategoryId')]: null,
  });
  const [errors, setErrors] = useState({});
  const [images, setImages] = useState([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, d, allImgs] = await Promise.all([getCategories(), getDishes(), getImages()]);
      setCategories(c); setAllDishes(d);
      if (isEdit) {
        const found = d.find((x) => x[f('DishId')] === dishId);
        if (found) setForm(found);
        setImages(allImgs.filter((i) => i[f('DishId')] === dishId));
      } else if (c.length > 0) {
        setForm((prev) => ({ ...prev, [f('DishCategoryId')]: c[0][f('DishCategoryId')] }));
      }
    })();
  }, []);

  const setField = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    const isThumb = images.length === 0;
    const newImg = {
      [f('ImageId')]: Date.now(),
      [f('ImageUrl')]: newImageUrl.trim(),
      [f('IsThumbnail')]: isThumb,
      [f('DishId')]: form[f('DishId')] || 0,
    };
    setImages([...images, newImg]);
    setNewImageUrl('');
  };

  const handleSetThumbnail = (imgId) => {
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        [f('IsThumbnail')]: img[f('ImageId')] === imgId,
      }))
    );
  };

  const handleRemoveImage = (imgId) => {
    setImages((prev) => prev.filter((img) => img[f('ImageId')] !== imgId));
  };

  const onSubmit = async () => {
    const errs = validateDish(form, allDishes, categories);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const normalized = {
      ...form,
      [f('Price')]: Number(form[f('Price')]),
      [f('PreparationTime')]: Number(form[f('PreparationTime')]),
    };

    let updatedDishes;
    let finalDishId = dishId;

    if (isEdit) {
      updatedDishes = allDishes.map((x) => (x[f('DishId')] === dishId ? normalized : x));
    } else {
      finalDishId = await nextId(STORAGE_KEYS.DISH, f('DishId'));
      normalized[f('DishId')] = finalDishId;
      updatedDishes = [...allDishes, normalized];
    }
    
    await saveDishes(updatedDishes);

    const allImgs = await getImages();
    const otherImgs = allImgs.filter((i) => i[f('DishId')] !== finalDishId);
    const finalImgs = images.map((img) => ({ ...img, [f('DishId')]: finalDishId }));
    await saveImages([...otherImgs, ...finalImgs]);

    await addPendingSync(isEdit ? 'UPDATE' : 'CREATE', normalized);

    navigation.goBack();
  };

  const executeDelete = async () => {
    try {
      const updated = allDishes.filter((x) => x[f('DishId')] !== dishId);
      await saveDishes(updated);
      const imgs = await getImages();
      await saveImages(imgs.filter((i) => i[f('DishId')] !== dishId));
      
      await addPendingSync('DELETE', { [f('DishId')]: dishId });
      
      setShowDeleteConfirm(false);
      navigation.goBack();
    } catch(e) {
      // Đã dịch thông báo lỗi
      Alert.alert(t('error'), t('cannot_delete') || 'Cannot delete'); 
    }
  };

  const renderError = (key) => errors[key] ? <Text style={styles.err}>{t(errors[key])}</Text> : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.label}>{t('name')}</Text>
      <TextInput style={styles.input} value={form[f('Name')]} onChangeText={(v) => setField(f('Name'), v)} placeholder={t('name')} placeholderTextColor="#999" />
      {renderError(f('Name'))}

      {/* Sửa gap thành marginRight */}
      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.label}>{t('price')}</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={String(form[f('Price')])} onChangeText={(v) => setField(f('Price'), v)} placeholder="0" placeholderTextColor="#999" />
          {renderError(f('Price'))}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{t('prep_time')}</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={String(form[f('PreparationTime')])} onChangeText={(v) => setField(f('PreparationTime'), v)} placeholder="0" placeholderTextColor="#999" />
          {renderError(f('PreparationTime'))}
        </View>
      </View>

      <Text style={styles.label}>{t('description')}</Text>
      <TextInput style={[styles.input, { height: 80 }]} multiline value={form[f('Description')]} onChangeText={(v) => setField(f('Description'), v)} placeholderTextColor="#999" />

      <Text style={styles.label}>{t('category')}</Text>
      {/* Sửa gap thành marginRight và marginBottom */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {categories.map((c) => {
          const cid = c[f('DishCategoryId')];
          const active = form[f('DishCategoryId')] === cid;
          return (
            <TouchableOpacity key={cid} style={[styles.chip, active && styles.chipActive, { marginRight: 8, marginBottom: 8 }]} onPress={() => setField(f('DishCategoryId'), cid)}>
              <Text style={{ color: active ? '#fff' : '#555', fontWeight: '500' }}>
                {cid === 1 ? t('cat_main') : cid === 2 ? t('cat_drink') : cid === 3 ? t('cat_dessert') : c[f('Name')]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {renderError(f('DishCategoryId'))}

      <View style={styles.switchRow}>
        <Text style={styles.label}>{t('available')}</Text>
        <Switch value={!!form[f('IsAvailable')]} onValueChange={(v) => setField(f('IsAvailable'), v)} />
      </View>

      <Text style={styles.sectionTitle}>{t('images')}</Text>
      
      {images.map((img) => (
        <View key={String(img[f('ImageId')])} style={styles.imgRow}>
          <Image source={{ uri: img[f('ImageUrl')] }} style={styles.imgThumb} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <TouchableOpacity onPress={() => handleSetThumbnail(img[f('ImageId')])}>
              <Text style={{ color: img[f('IsThumbnail')] ? '#34C759' : '#8E8E93', fontWeight: '600' }}>
                {img[f('IsThumbnail')] ? `✓ ${t('thumbnail')}` : t('set_thumbnail')}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => handleRemoveImage(img[f('ImageId')])}>
            <Text style={{ color: '#FF3B30', fontWeight: '600' }}>{t('delete')}</Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
        <TextInput 
          style={[styles.input, { flex: 1, marginBottom: 0 }]} 
          placeholder="https://..." 
          value={newImageUrl} 
          onChangeText={setNewImageUrl} 
          placeholderTextColor="#999"
        />
        <TouchableOpacity style={styles.addImgBtn} onPress={handleAddImage}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('add_image')}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={onSubmit}>
        <Text style={styles.saveText}>{t('save')}</Text>
      </TouchableOpacity>

      {isEdit && (
        <TouchableOpacity style={styles.delBtn} onPress={() => setShowDeleteConfirm(true)}>
          <Text style={styles.delText}>{t('delete')}</Text>
        </TouchableOpacity>
      )}
      <View style={{ height: 40 }} />

      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' }}>{t('confirm_delete')}</Text>
            {/* Sửa gap thành marginRight */}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  label: { fontWeight: '600', marginTop: 12, marginBottom: 6, color: '#333' },
  sectionTitle: { fontWeight: '700', marginTop: 24, marginBottom: 10, fontSize: 16, color: '#1C1C1E', textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#D1D1D6', borderRadius: 10, padding: 12, backgroundColor: '#FFFFFF', marginBottom: 4, color: '#333' },
  err: { color: '#FF3B30', fontSize: 12, marginTop: 2, marginBottom: 8, fontWeight: '500' },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D1D6' },
  chipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#D1D1D6' },
  saveBtn: { marginTop: 24, backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  delBtn: { marginTop: 12, backgroundColor: '#FFEBEB', padding: 16, borderRadius: 12, alignItems: 'center' },
  delText: { color: '#FF3B30', fontWeight: '700', fontSize: 16 },
  imgRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  imgThumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#F2F2F7' },
  addImgBtn: { backgroundColor: '#007AFF', padding: 14, borderRadius: 10, marginLeft: 10 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', padding: 24, borderRadius: 16, width: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  modalBtn: { padding: 12, borderRadius: 10, flex: 1, alignItems: 'center' }
});
