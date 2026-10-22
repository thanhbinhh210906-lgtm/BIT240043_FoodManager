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
import { ActivityIndicator, View, Alert, Text } from 'react-native'; // Thêm Text
import NetInfo from '@react-native-community/netinfo';
import { getPendingSync, clearPendingSync } from './src/services/storage';
import { createDishApi, updateDishApi, deleteDishApi } from './src/services/api';
import { f } from './src/models/models';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { t } = useTranslation();
  const { ready } = useApp();

  // 1. Thêm state để lưu trạng thái mạng
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      // 2. Cập nhật trạng thái mạng (nếu isConnected = false thì là đang offline)
      setIsOffline(!state.isConnected);

      if (state.isConnected) {
        const queue = await getPendingSync();
        if (queue.length > 0) {
          console.log(`Đang đồng bộ ${queue.length} thay đổi lên MockAPI...`);
          try {
            for (const item of queue) {
              const payload = item.payload;

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
            Alert.alert('Sync OK', 'Dữ liệu đã được tự động đồng bộ lên MockAPI!');
          } catch (err) {
            console.log('Lỗi đồng bộ:', err);
            Alert.alert('Sync Error', 'Không thể kết nối MockAPI.');
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  if (!ready) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator /></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      {/* 3. Hiển thị Banner đỏ khi mất mạng */}
      {isOffline && (
        <View style={{ backgroundColor: '#e33', paddingTop: 40, paddingBottom: 10, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>⚠️ Ngoại tuyến - Đang lưu dữ liệu vào máy</Text>
        </View>
      )}
      
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="DishList" component={DishListScreen} options={{ title: t('list_title') }} />
          <Stack.Screen name="DishDetail" component={DishDetailScreen} options={{ title: t('detail_title') }} />
          <Stack.Screen name="DishForm" component={DishFormScreen}
            options={({ route }) => ({ title: route.params?.mode === 'edit' ? t('edit_title') : t('add_title') })} />
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
