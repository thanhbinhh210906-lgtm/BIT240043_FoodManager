// MSSV: BIT240043 - Project: BIT240043_FoodManager
import React, { useEffect, useState } from 'react';
import './src/i18n';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { AppProvider, useApp } from './src/context/AppContext';
import DishListScreen from './src/screens/DishListScreen';
import DishDetailScreen from './src/screens/DishDetailScreen';
import DishFormScreen from './src/screens/DishFormScreen';
import { ActivityIndicator, View, Text, StyleSheet, Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { getPendingSync, clearPendingSync } from './src/services/storage';
import { createDishApi, updateDishApi, deleteDishApi } from './src/services/api';
import { f } from './src/models/models';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { t } = useTranslation();
  const { ready } = useApp();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      // Cập nhật trạng thái mạng
      setIsOffline(!state.isConnected);

      // NẾU CÓ MẠNG: Tự động đồng bộ dữ liệu đang chờ
      if (state.isConnected) {
        const queue = await getPendingSync();
        if (queue.length > 0) {
          console.log(`Đang đồng bộ ${queue.length} thay đổi lên MockAPI...`);
          try {
            for (const item of queue) {
              const payload = item.payload;
              
              // Chuẩn bị payload cho API (thêm tiền tố BIT240043_)
              const apiPayload = {
                BIT240043_DishId: payload[f('DishId')],
                BIT240043_Name: payload[f('Name')],
                BIT240043_Price: payload[f('Price')],
                BIT240043_PreparationTime: payload[f('PreparationTime')],
                BIT240043_IsAvailable: payload[f('IsAvailable')],
                BIT240043_Description: payload[f('Description')],
                BIT240043_DishCategoryId: payload[f('DishCategoryId')]
              };

              if (item.action === 'CREATE') {
                await createDishApi(apiPayload);
              } else if (item.action === 'UPDATE') {
                await updateDishApi(payload[f('DishId')], apiPayload);
              } else if (item.action === 'DELETE') {
                await deleteDishApi(payload[f('DishId')]);
              }
            }
            await clearPendingSync();
            Alert.alert('Sync OK', t('sync_success') || 'Đã đồng bộ dữ liệu lên MockAPI!');
          } catch (err) {
            console.log('Lỗi đồng bộ:', err);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [t]);

  if (!ready) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* BANNER CẢNH BÁO NGOẠI TUYẾN (Chỉ hiện khi thực sự mất mạng) */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            ⚠️ {t('offline_warning') || 'Đang ngoại tuyến - Dữ liệu sẽ được lưu tạm'}
          </Text>
        </View>
      )}

      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="DishList" component={DishListScreen} options={{ title: t('list_title') }} />
          <Stack.Screen name="DishDetail" component={DishDetailScreen} options={{ title: t('detail_title') }} />
          <Stack.Screen 
            name="DishForm" 
            component={DishFormScreen}
            options={({ route }) => ({ title: route.params?.mode === 'edit' ? t('edit_title') : t('add_title') })} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <AppProvider>
      <RootNavigator />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  offlineBanner: {
    backgroundColor: '#FF3B30',
    paddingTop: 50, 
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  offlineText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
