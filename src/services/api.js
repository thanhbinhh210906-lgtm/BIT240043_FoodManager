// MSSV: BIT240043
// Link lấy từ MockAPI (Bấm vào chữ BIT240043_Dish trên web để lấy link)
const BASE_URL = 'https://6ad71c60f71f154ac487cab2.mockapi.io/BIT240043_Dish';

export async function fetchDishesFromApi() {
  try {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error('Network response was not ok');
    return await res.json();
  } catch (error) {
    console.log('API fetch error:', error);
    return null; // Trả về null để biết là lỗi mạng
  }
}

export async function createDishApi(dish) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dish),
  });
  return res.json();
}

export async function updateDishApi(id, dish) {
  // Lưu ý: MockAPI dùng cái ID mặc định của nó (chuỗi số), 
  // nhưng nếu mình gửi kèm BIT240043_DishId thì nó vẫn nhận.
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dish),
  });
  return res.json();
}

export async function deleteDishApi(id) {
  await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
}