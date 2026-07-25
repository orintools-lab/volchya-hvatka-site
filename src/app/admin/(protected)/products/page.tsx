import { db } from "@/lib/db/client";
import { updateProduct } from "../../actions";

export default async function ProductsPage() {
  const products = await db.product.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
  return <><header className="admin-page-head"><div><p>Каталог</p><h1>Товары</h1></div></header>
    <div className="admin-card-grid">{products.map((product)=><form action={updateProduct} className="admin-panel admin-form" key={product.id}>
      <input type="hidden" name="id" value={product.id}/><h2>{product.name}</h2><p>{product.category}</p>
      <div className="form-grid"><label>Цена<input name="price" defaultValue={product.price.toFixed(2)} required/></label>
      <label>Старая цена<input name="oldPrice" defaultValue={product.oldPrice?.toFixed(2) ?? ""}/></label>
      <label>Вес, г<input name="weightGrams" type="number" defaultValue={product.weightGrams} min="1" required/></label>
      <label>Длина, см<input name="lengthCm" type="number" defaultValue={product.lengthCm} min="1" required/></label>
      <label>Ширина, см<input name="widthCm" type="number" defaultValue={product.widthCm} min="1" required/></label>
      <label>Высота, см<input name="heightCm" type="number" defaultValue={product.heightCm} min="1" required/></label>
      <label>Количество мест<input name="packageCount" type="number" defaultValue={product.packageCount} min="1" required/></label></div>
      <button className="button">Сохранить</button>
    </form>)}</div></>;
}
