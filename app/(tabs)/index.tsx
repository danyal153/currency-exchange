import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDocs,
} from "firebase/firestore";

const currencies = ["USD", "MXN", "KWD", "INR", "SAR", "CHF", "NOK", "GBP"];

export default function Index() {
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  const [result, setResult] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [grandTotal, setGrandTotal] = useState<number>(0);

  // Example: Hardcoded rates (replace with real API if needed)
  const defaultRates: Record<string, number> = {
    USD: 278,
    MXN: 16.5,
    KWD: 903,
    INR: 3.35,
    SAR: 74,
    CHF: 310,
    NOK: 26,
    GBP: 355,
  };

  useEffect(() => {
    setRates(defaultRates);
  }, []);

  // Real-time history fetch
  useEffect(() => {
    const q = query(collection(db, "conversions"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((docItem) => {
        data.push({ id: docItem.id, ...docItem.data() }); // <-- important: id must be doc.id
      });
      setHistory(data);
    });
    return () => unsubscribe();
  }, []);


  // Convert and save/update
  const convertCurrency = async () => {
    if (!amount || !rates[currency]) {
      Alert.alert("Error", "Invalid amount or rates not loaded yet.");
      return;
    }

    const converted = parseFloat(amount) * rates[currency];
    const formattedResult = converted.toFixed(2);
    setResult(formattedResult);

    try {
      if (editId) {
        await updateDoc(doc(db, "conversions", editId), {
          amount: parseFloat(amount),
          currency,
          result: formattedResult,
          timestamp: Date.now(),
        });
        setEditId(null);
      } else {
        await addDoc(collection(db, "conversions"), {
          amount: parseFloat(amount),
          currency,
          result: formattedResult,
          timestamp: Date.now(),
        });
      }
      setAmount("");
    } catch (err) {
      console.log("Firestore Error:", err);
    }
  };

  // Delete conversion by document ID
  const deleteConversion = async (docId: string) => {
    if (!docId) return;

    try {
      await deleteDoc(doc(db, "conversions", docId));
      console.log("Conversion deleted successfully");
    } catch (err) {
      console.log("Delete error:", err);
    }
  };


  const editConversion = (item: any) => {
    setAmount(item.amount.toString());
    setCurrency(item.currency);
    setEditId(item.id);
  };

  // Aggregate history
  const aggregatedHistory: { [key: string]: { totalAmount: number; totalResult: number } } = {};
  history.forEach((item) => {
    if (!aggregatedHistory[item.currency]) {
      aggregatedHistory[item.currency] = { totalAmount: 0, totalResult: 0 };
    }
    aggregatedHistory[item.currency].totalAmount += item.amount;
    aggregatedHistory[item.currency].totalResult += parseFloat(item.result);
  });

  const calculateGrandTotal = async () => {
    let sum = 0;
    Object.values(aggregatedHistory).forEach((data) => {
      sum += data.totalResult;
    });
    setGrandTotal(sum);

    try {
      await addDoc(collection(db, "totals"), {
        grandTotal: sum,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.log("Error saving grand total:", err);
    }
  };

  const resetGrandTotal = async () => {
    try {
      const snapshot = await getDocs(collection(db, "totals"));
      const deletes = snapshot.docs.map((d) => deleteDoc(doc(db, "totals", d.id)));
      await Promise.all(deletes);
      setGrandTotal(0);
      Alert.alert("Reset", "Grand total has been cleared!");
    } catch (err) {
      console.log("Reset error:", err);
    }
  };

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Currency Converter</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter Amount"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />

        <View style={styles.pickerBox}>
          <Picker
            selectedValue={currency}
            onValueChange={(itemValue) => setCurrency(itemValue as string)}
          >
            {currencies.map((cur) => (
              <Picker.Item key={cur} label={cur} value={cur} />
            ))}
          </Picker>
        </View>

        <TouchableOpacity style={styles.button} onPress={convertCurrency}>
          <Text style={styles.buttonText}>
            {editId ? "Update Conversion" : "Convert to PKR"}
          </Text>
        </TouchableOpacity>

        {result && <Text style={styles.result}>Result: {result} PKR</Text>}

        {/* History with Edit/Delete */}
        <Text style={styles.historyTitle}>Conversion History</Text>
        <View style={styles.historyContainer}>
          {history.map((item) => (
            <View key={item.id} style={styles.historyRow}>
              <Text style={styles.rowText}>
                {item.amount} {item.currency} → {item.result} PKR
              </Text>
              <View style={styles.rowButtons}>
                <TouchableOpacity style={styles.editBtn} onPress={() => editConversion(item)}>
                  <Text style={styles.btnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteConversion(item.
                    id)} // <-- use item.id from Firestore
                >
                  <Text style={styles.btnText}>Delete</Text>
                </TouchableOpacity>

              </View>
            </View>
          ))}
        </View>

        {/* Aggregated history */}
        <Text style={styles.historyTitle}>Summed by Currency</Text>
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.headerText}>Currency</Text>
            <Text style={styles.headerText}>Total Amount</Text>
            <Text style={styles.headerText}>Total Result (PKR)</Text>
          </View>
          {Object.entries(aggregatedHistory).map(([cur, data]) => (
            <View key={cur} style={styles.historyRow}>
              <Text style={styles.rowText}>{cur}</Text>
              <Text style={styles.rowText}>{data.totalAmount}</Text>
              <Text style={styles.rowText}>{data.totalResult.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Grand Total */}
        <TouchableOpacity style={[styles.button, { marginTop: 10 }]} onPress={calculateGrandTotal}>
          <Text style={styles.buttonText}>Show Grand Total PKR & Save</Text>
        </TouchableOpacity>
        {grandTotal > 0 && <Text style={styles.result}>Grand Total: {grandTotal.toFixed(2)} PKR</Text>}

        <TouchableOpacity style={[styles.button, { backgroundColor: "#f59e0b" }]} onPress={resetGrandTotal}>
          <Text style={styles.buttonText}>Reset Grand Total</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: "#f4f6f8" },
  container: { flex: 1, alignItems: "center", padding: 20 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20, color: "#1e293b" },
  input: { width: "100%", borderWidth: 1, borderColor: "#cbd5e1", padding: 12, borderRadius: 8, backgroundColor: "#fff", marginBottom: 15, fontSize: 16 },
  pickerBox: { width: "100%", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, marginBottom: 20, backgroundColor: "#fff" },
  button: { backgroundColor: "#2563eb", padding: 15, borderRadius: 8, width: "100%", alignItems: "center", marginBottom: 15 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  result: { marginTop: 15, fontSize: 20, fontWeight: "bold", color: "#16a34a" },
  historyTitle: { marginTop: 25, fontSize: 20, fontWeight: "bold", color: "#1e293b" },
  historyContainer: { width: "100%", marginTop: 10, backgroundColor: "#fff", borderRadius: 8, padding: 10 },
  historyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  rowText: { flex: 2, textAlign: "center" },
  rowButtons: { flexDirection: "row", flex: 1, justifyContent: "space-around" },
  editBtn: { backgroundColor: "#facc15", padding: 5, borderRadius: 5 },
  deleteBtn: { backgroundColor: "#ef4444", padding: 5, borderRadius: 5 },
  btnText: { color: "#fff", fontWeight: "bold" },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#cbd5e1", paddingBottom: 5, marginBottom: 5 },
  headerText: { flex: 1, fontWeight: "bold", textAlign: "center" },
});
