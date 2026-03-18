import React, { useState } from "react";
import { createClient } from "@base44/sdk";
import { useUser, Auth } from "@base44/sdk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const base44 = createClient({
  appId: "Legendary_tcg",
  token: "Legendary_tcg",
  functionsVersion: "v1",
  requiresAuth: true
});

// ================= APP =================
export default function App() {
  const { user, isLoading } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <Login />;

  return user.role === "admin" ? <Admin /> : <Store />;
}

// ================= LOGIN =================
function Login() {
  return (
    <div className="flex h-screen items-center justify-center bg-black">
      <div className="bg-[#1a1333] p-6 rounded-xl text-white">
        <Auth />
      </div>
    </div>
  );
}

// ================= STORE =================
function Store() {
  const { data: cards = [] } = useQuery({
    queryKey: ["cards"],
    queryFn: () => base44.entities.PokemonCard.list()
  });

  const [cart, setCart] = useState([]);

  const addToCart = (card) => {
    setCart((prev) => {
      const exist = prev.find((i) => i.id === card.id);
      if (exist) {
        return prev.map((i) =>
          i.id === card.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...card, qty: 1 }];
    });
  };

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="p-6 bg-[#0b0618] text-white min-h-screen">
      <h1 className="text-2xl mb-4">Legendary TCG</h1>

      <div className="grid grid-cols-2 gap-4">
        {cards.map((c) => (
          <div key={c.id} className="bg-[#1a1333] p-3 rounded-xl">
            <img src={c.image_url} className="h-40 w-full object-cover" />
            <p>{c.name}</p>
            <p>Rp {c.price}</p>
            <button onClick={() => addToCart(c)} className="bg-yellow-400 text-black px-2 py-1 mt-2">Add</button>
          </div>
        ))}
      </div>

      {/* CART */}
      <div className="mt-6">
        <h2>Cart</h2>
        {cart.map((c) => (
          <p key={c.id}>{c.name} x {c.qty}</p>
        ))}
        <p>Total: Rp {total}</p>

        <Checkout cart={cart} total={total} />
      </div>
    </div>
  );
}

// ================= CHECKOUT =================
function Checkout({ cart, total }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const order = useMutation({
    mutationFn: () => base44.entities.Order.create({
      customer_name: name,
      customer_phone: phone,
      items: cart.map(c => ({
        card_id: c.id,
        card_name: c.name,
        price: c.price,
        quantity: c.qty
      })),
      total_amount: total
    })
  });

  return (
    <div className="mt-4">
      <input placeholder="Name" onChange={e=>setName(e.target.value)} />
      <input placeholder="Phone" onChange={e=>setPhone(e.target.value)} />

      <button onClick={()=>order.mutate()} className="bg-green-500 px-3 py-1 mt-2">
        Place Order
      </button>
    </div>
  );
}

// ================= ADMIN =================
function Admin() {
  return (
    <div className="p-6 bg-black text-white min-h-screen">
      <h1>Admin Dashboard</h1>
      <Products />
      <Orders />
    </div>
  );
}

// ================= PRODUCTS =================
function Products() {
  const qc = useQueryClient();
  const [form, setForm] = useState({});

  const { data: cards = [] } = useQuery({
    queryKey: ["cards"],
    queryFn: () => base44.entities.PokemonCard.list()
  });

  const save = useMutation({
    mutationFn: (data) => data.id
      ? base44.entities.PokemonCard.update(data.id, data)
      : base44.entities.PokemonCard.create(data),
    onSuccess: () => qc.invalidateQueries(["cards"])
  });

  return (
    <div>
      <h2>Products</h2>
      <input placeholder="Name" onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
      <input placeholder="Price" onChange={e=>setForm(f=>({...f,price:Number(e.target.value)}))} />
      <button onClick={()=>save.mutate(form)}>Save</button>

      {cards.map(c => (
        <div key={c.id}>
          {c.name} - {c.price}
        </div>
      ))}
    </div>
  );
}

// ================= ORDERS =================
function Orders() {
  const qc = useQueryClient();

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list()
  });

  const update = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Order.update(id, { status }),
    onSuccess: () => qc.invalidateQueries(["orders"])
  });

  return (
    <div>
      <h2>Orders</h2>
      {orders.map(o => (
        <div key={o.id}>
          Rp {o.total_amount} - {o.status}
          <button onClick={()=>update.mutate({id:o.id,status:'confirmed'})}>Confirm</button>
        </div>
      ))}
    </div>
  );
}