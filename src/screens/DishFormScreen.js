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

  // State cho Modal Xóa
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
      Alert.alert('Lỗi', 'Không thể xóa');
    }
  };

  const renderError = (key) => errors[key] ? <Text style={styles.err}>{t(errors[key])}</Text> : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.label}>{t('name')}</Text>
      <TextInput style={styles.input} value={form[f('Name')]} onChangeText={(v) => setField(f('Name'), v)} placeholder={t('name')} />
      {renderError(f('Name'))}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{t('price')}</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={String(form[f('Price')])} onChangeText={(v) => setField(f('Price'), v)} placeholder="0" />
          {renderError(f('Price'))}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{t('prep_time')}</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={String(form[f('PreparationTime')])} onChangeText={(v) => setField(f('PreparationTime'), v)} placeholder="0" />
          {renderError(f('PreparationTime'))}
        </View>
      </View>

      <Text style={styles.label}>{t('description')}</Text>
      <TextInput style={[styles.input, { height: 70 }]} multiline value={form[f('Description')]} onChangeText={(v) => setField(f('Description'), v)} />

      <Text style={styles.label}>{t('category')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {categories.map((c) => {
          const cid = c[f('DishCategoryId')];
          const active = form[f('DishCategoryId')] === cid;
          return (
            <TouchableOpacity key={cid} style={[styles.chip, active && styles.chipActive]} onPress={() => setField(f('DishCategoryId'), cid)}>
              <Text style={{ color: active ? '#fff' : '#333' }}>
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

      <Text style={styles.label}>--- {t('images')} ---</Text>
      
      {images.map((img) => (
        <View key={String(img[f('ImageId')])} style={styles.imgRow}>
          <Image source={{ uri: img[f('ImageUrl')] }} style={styles.imgThumb} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <TouchableOpacity onPress={() => handleSetThumbnail(img[f('ImageId')])}>
              <Text style={{ color: img[f('IsThumbnail')] ? '#2a7' : '#888', fontWeight: 'bold' }}>
                {img[f('IsThumbnail')] ? `✓ ${t('thumbnail')}` : t('set_thumbnail')}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => handleRemoveImage(img[f('ImageId')])}>
            <Text style={{ color: '#e33', fontWeight: 'bold' }}>{t('delete')}</Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
        <TextInput 
          style={[styles.input, { flex: 1, marginBottom: 0 }]} 
          placeholder="https://..." 
          value={newImageUrl} 
          onChangeText={setNewImageUrl} 
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

      {/* Hộp thoại Xác nhận Xóa trong Form */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>{t('confirm_delete')}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#ccc' }]} onPress={() => setShowDeleteConfirm(false)}>
                <Text>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#e33' }]} onPress={executeDelete}>
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
  container: { flex: 1, backgroundColor: '#fff' },
  label: { fontWeight: '600', marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, backgroundColor: '#fff', marginBottom: 4 },
  err: { color: '#c00', fontSize: 12, marginTop: 4 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#eee' },
  chipActive: { backgroundColor: '#2a7' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  saveBtn: { marginTop: 24, backgroundColor: '#2a7', padding: 14, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
  delBtn: { marginTop: 10, backgroundColor: '#e33', padding: 14, borderRadius: 10, alignItems: 'center' },
  delText: { color: '#fff', fontWeight: '700' },
  imgRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 8, borderRadius: 8, marginBottom: 8 },
  imgThumb: { width: 50, height: 50, borderRadius: 6, backgroundColor: '#ddd' },
  addImgBtn: { backgroundColor: '#2a7', padding: 10, borderRadius: 8, marginLeft: 8 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '80%' },
  modalBtn: { padding: 10, borderRadius: 6, flex: 1, alignItems: 'center' }
});
