import { useState, useEffect } from "react";
import { supabase } from "./supabase"; // Assuming supabase client is exported from here

import type { Memento } from "../types"; // Import the comprehensive Memento type

const useMementos = () => {
  const [mementos, setMementos] = useState<Memento[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMementos = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("mementos")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        setMementos(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMementos();

    // Realtime subscription for new mementos
    const mementosSubscription = supabase
      .channel("public:mementos")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mementos" },
        (payload: { new: Memento }) => {
          setMementos((prev: Memento[]) => [payload.new, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "mementos" },
        (payload: { old: { id: string } }) => {
          setMementos((prev: Memento[]) =>
            prev.filter((m: Memento) => m.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      mementosSubscription.unsubscribe();
    };
  }, []);

  return { mementos, loading, error };
};

export default useMementos;
