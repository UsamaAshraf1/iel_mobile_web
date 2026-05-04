import { useState, useEffect } from "react";
import { supabase } from "../supabaseConfig";
export default function Stocks() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [Refresh, setRefresh] = useState(true);

  const fetchStocks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("stocks")
      .select("*")
      .ilike("name", "%Bank%")
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    else setStocks(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchStocks();
  }, [Refresh]);

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4 ms-24">Filtered Stocks</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {stocks.map((stock) => (
            <li
              key={stock.id}
              className="flex items-center justify-between p-2 border-b"
            >
              <div>
                <span className="font-semibold">{stock.symbol}</span> - {stock.name}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}