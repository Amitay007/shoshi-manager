import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, ComposedChart, Bar, Line
} from "recharts";
import {
  TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronRight,
  FileText, PieChart, RotateCcw, Plus, Check, Calendar as CalendarIcon,
  CreditCard, Banknote, Landmark, Smartphone, Clock, AlertCircle
} from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";

// --- Mock Data & Constants ---
const years = ["2024", "2025", "2026"];
const months = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
];

const paymentMethods = [
  { id: "bank", label: "העברה בנקאית", icon: Landmark },
  { id: "check", label: "צ'ק", icon: FileText },
  { id: "card", label: "אשראי", icon: CreditCard },
  { id: "bit", label: "Bit/PayBox", icon: Smartphone },
  { id: "cash", label: "מזומן", icon: Banknote },
];

const statusOptions = {
  forecast: { label: "צפי", color: "text-slate-500", bg: "bg-slate-100", border: "border-slate-200" },
  pending: { label: "הופקד (ממתין)", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  cleared: { label: "נפרע (בבנק)", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" }
};

const initialClients = [
  "עיריית תל אביב",
  "רשת אורט",
  "מתנ\"ס גבעתיים",
  "אינטל ישראל",
  "לקוח פרטי - משה כהן",
  "רבין - ערבי כיתה ז'",
  "בגין - פרחי רפואה",
  "עירוני ט ת\"א",
  "באר אורה",
  "כסייפא",
  "צאלים",
  "ליאור ציפורניים",
  "אדוה השקעות"
];

// --- Real Data Generators ---

const recurring = (amount) => Array(12).fill(amount);
const oneOff = (amount, monthIndex) => {
    const arr = Array(12).fill(0);
    arr[monthIndex] = amount;
    return arr;
};

// Initial Data Structure
const createInitialData = () => {
  const data = {};

  years.forEach(year => {
    const is2025 = year === "2025";
    const is2024 = year === "2024";

    data[year] = {
      openingBalance: is2025 ? 15000 : (is2024 ? 0 : 50000),
      income: [
        {
          id: "inc_moe",
          name: "משרד החינוך (Ministry of Education)",
          subItems: [
            {
              id: "moe_1", name: "גפ\"ן - תוכניות העשרה",
              monthly: is2025 ? oneOff(12000, 2) : oneOff(10000, 2),
              status: "forecast", paymentMethod: "bank", dueDate: new Date(Number(year), 2, 15)
            }
          ]
        },
        {
          id: "inc_private",
          name: "לקוחות פרטיים (Private Clients)",
          subItems: [
            {
              id: "priv_1", name: "אירוע - ליאור ציפורניים",
              monthly: is2025 ? oneOff(2170, 0) : oneOff(2000, 0),
              status: "cleared", paymentMethod: "bit", dueDate: new Date(Number(year), 0, 12), valueDate: new Date(Number(year), 0, 12)
            }
          ]
        },
        {
          id: "inc_matnas",
          name: "מתנ\"סים (Community Centers)",
          subItems: [
            {
              id: "mat_1", name: "מתנ\"ס גבעתיים - חוגים",
              monthly: recurring(4500),
              status: "pending", paymentMethod: "bank", dueDate: new Date(Number(year), 0, 10)
            }
          ]
        },
        {
          id: "inc_inst",
          name: "מוסדות (Institutions)",
          subItems: [
            {
              id: "inst_1", name: "עיריית תל אביב",
              monthly: is2025 ? oneOff(8500, 4) : oneOff(8000, 4),
              status: "forecast", paymentMethod: "bank", dueDate: new Date(Number(year), 4, 1)
            }
          ]
        }
      ],
      expenses: [
        {
          id: "exp_mgmt",
          name: "הנהלה וכלליות (Management & General)",
          subItems: [
            {
              id: "mgmt_1", name: "רואה חשבון",
              monthly: recurring(1200),
              status: "cleared", paymentMethod: "bank", dueDate: new Date(Number(year), 0, 15)
            },
            {
              id: "mgmt_2", name: "שכירות משרד",
              monthly: recurring(3500),
              status: "cleared", paymentMethod: "bank", dueDate: new Date(Number(year), 0, 1)
            }
          ]
        },
        {
          id: "exp_marketing",
          name: "שיווק ומכירות (Marketing & Sales)",
          subItems: [
            {
              id: "mkt_1", name: "קמפיין פייסבוק/אינסטגרם",
              monthly: recurring(2000),
              status: "cleared", paymentMethod: "card", dueDate: new Date(Number(year), 0, 5)
            },
            {
              id: "mkt_2", name: "בניית אתר (תשלומים)",
              monthly: is2025 ? oneOff(1500, 1) : [0],
              status: "cleared", paymentMethod: "bank", dueDate: new Date(Number(year), 1, 10)
            }
          ]
        },
        {
          id: "exp_salary",
          name: "שכר (Salaries)",
          subItems: [
            {
              id: "sal_1", name: "משכורות עובדים",
              monthly: recurring(15000),
              status: "cleared", paymentMethod: "bank", dueDate: new Date(Number(year), 0, 9)
            },
            {
              id: "sal_2", name: "ביטוח לאומי מעסיק",
              monthly: recurring(950),
              status: "cleared", paymentMethod: "bank", dueDate: new Date(Number(year), 0, 15)
            }
          ]
        },
        {
          id: "exp_ops",
          name: "תפעול (Operations)",
          subItems: [
            {
              id: "ops_1", name: "ציוד מתכלה VR",
              monthly: recurring(600),
              status: "forecast", paymentMethod: "card", dueDate: new Date(Number(year), 0, 1)
            },
            {
              id: "ops_2", name: "חשמל ותקשורת",
              monthly: recurring(450),
              status: "cleared", paymentMethod: "bank", dueDate: new Date(Number(year), 0, 20)
            }
          ]
        },
        {
          id: "exp_finance",
          name: "מימון (Financing)",
          subItems: [
            {
              id: "fin_1", name: "עמלות בנק",
              monthly: recurring(85),
              status: "cleared", paymentMethod: "bank", dueDate: new Date(Number(year), 0, 1)
            },
            {
              id: "fin_2", name: "החזר הלוואה",
              monthly: recurring(1924),
              status: "cleared", paymentMethod: "bank", dueDate: new Date(Number(year), 0, 10)
            }
          ]
        }
      ]
    };
  });
  return data;
};

// Helper to calculate category totals
const calculateGrandTotal = (categories) => {
  const monthlyTotals = Array(12).fill(0);
  categories.forEach(cat => {
    cat.subItems.forEach(sub => {
      sub.monthly.forEach((val, idx) => monthlyTotals[idx] += (Number(val) || 0));
    });
  });
  const total = monthlyTotals.reduce((a, b) => a + b, 0);
  return { monthlyTotals, total };
};

export default function CashFlow() {
  const [cashFlowData, setCashFlowData] = useState(createInitialData());
  const [selectedYear, setSelectedYear] = useState("2025");
  const [expandedRows, setExpandedRows] = useState({
      "inc_moe": true,
      "exp_salary": true
  });
  const [clients, setClients] = useState(initialClients);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    type: "income",
    client: "",
    isNewClient: false,
    newClientName: "",
    amount: "",
    categoryId: "",
    paymentMethod: "bank",
    checkNumber: "",
    depositDate: undefined, // Used for dueDate in the form
    valueDate: undefined,   // New field for value date
    status: "forecast",
    monthIndex: new Date().getMonth()
  });

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleReset = () => {
    if (confirm("האם אתה בטוח שברצונך לאפס את כל הנתונים לברירת המחדל?")) {
      setCashFlowData(createInitialData());
    }
  };

  const handleSaveTransaction = () => {
    if (!newTransaction.amount || !newTransaction.categoryId) return;

    const clientName = newTransaction.isNewClient ? newTransaction.newClientName : newTransaction.client;
    if (!clientName) return;

    if (newTransaction.isNewClient && !clients.includes(clientName)) {
      setClients(prev => [...prev, clientName]);
    }

    setCashFlowData(prev => {
      const newData = { ...prev };
      const yearData = newData[selectedYear];
      const collection = newTransaction.type === "income" ? yearData.income : yearData.expenses;
      const category = collection.find(c => c.id === newTransaction.categoryId);

      if (category) {
        const monthlyArr = Array(12).fill(0);
        monthlyArr[newTransaction.monthIndex] = Number(newTransaction.amount);

        const newSubItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: clientName,
          monthly: monthlyArr,
          status: newTransaction.status,
          paymentMethod: newTransaction.paymentMethod,
          checkNumber: newTransaction.checkNumber,
          dueDate: newTransaction.depositDate || new Date(Number(selectedYear), newTransaction.monthIndex, 1), // Using depositDate from form as dueDate
          valueDate: newTransaction.valueDate
        };

        category.subItems.push(newSubItem);
        setExpandedRows(prev => ({ ...prev, [category.id]: true }));
      }

      return newData;
    });

    setIsModalOpen(false);
    setNewTransaction(prev => ({ ...prev, amount: "", isNewClient: false, newClientName: "", checkNumber: "", depositDate: undefined, valueDate: undefined, status: "forecast" }));
  };

  const cycleStatus = (year, type, categoryId, subItemId) => {
    setCashFlowData(prev => {
      const newData = { ...prev };
      const collection = type === 'income' ? newData[year].income : newData[year].expenses;
      const category = collection.find(c => c.id === categoryId);
      const subItem = category.subItems.find(s => s.id === subItemId);
      if (subItem) {
        if (subItem.status === 'forecast') subItem.status = 'pending';
        else if (subItem.status === 'pending') subItem.status = 'cleared';
        else subItem.status = 'forecast';
      }
      return newData;
    });
  };

  const handleCellValueChange = (year, type, categoryId, subItemId, monthIndex, newValue) => {
    const numValue = parseInt(newValue) || 0;

    setCashFlowData(prev => {
      const newData = { ...prev };
      const collection = type === 'income' ? newData[year].income : newData[year].expenses;
      const category = collection.find(c => c.id === categoryId);
      const subItem = category.subItems.find(s => s.id === subItemId);

      const newMonthly = [...subItem.monthly];
      newMonthly[monthIndex] = numValue;
      subItem.monthly = newMonthly;

      return newData;
    });
  };

  const currentYearData = cashFlowData[selectedYear];
  const incomeStats = useMemo(() => calculateGrandTotal(currentYearData.income), [currentYearData]);
  const expensesStats = useMemo(() => calculateGrandTotal(currentYearData.expenses), [currentYearData]);

  const cumulativeData = useMemo(() => {
    let runningBalance = currentYearData.openingBalance || 0;
    return incomeStats.monthlyTotals.map((inc, i) => {
      const exp = expensesStats.monthlyTotals[i];
      const monthlyNet = inc - exp;
      runningBalance += monthlyNet;
      return {
        monthIndex: i,
        income: inc,
        expense: exp,
        monthlyNet: monthlyNet,
        cumulative: runningBalance
      };
    });
  }, [incomeStats, expensesStats, currentYearData.openingBalance]);

  const endOfYearBalance = cumulativeData[11]?.cumulative || 0;

  const chartData = months.map((month, index) => ({
    name: month,
    income: incomeStats.monthlyTotals[index],
    expenses: expensesStats.monthlyTotals[index],
    balance: cumulativeData[index].cumulative
  }));

  const formatCurrency = (val) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);

  const getMethodIcon = (methodId) => {
    const method = paymentMethods.find(m => m.id === methodId);
    const Icon = method ? method.icon : Banknote;
    return <Icon className="w-4 h-4" />;
  };

  const EditableCell = ({ value, onChange, isExpense, status }) => {
    const [localValue, setLocalValue] = useState(value);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => { setLocalValue(value); }, [value]);

    const handleBlur = () => {
      setIsEditing(false);
      onChange(localValue);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        setIsEditing(false);
        onChange(localValue);
      }
    };

    if (isEditing) {
      return (
        <Input
          autoFocus
          type="number"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="h-7 w-20 p-1 text-xs font-mono bg-white shadow-sm"
        />
      );
    }

    const isPositive = Number(value) > 0;
    const textClass = isPositive
        ? (isExpense ? 'text-red-700 font-bold' : 'text-emerald-700 font-bold')
        : 'text-slate-300';

    // Status visual effect on the cell
    const cellBg = status === 'forecast' ? 'bg-transparent' : (status === 'pending' ? 'bg-orange-50/50' : 'bg-emerald-50/50');

    return (
      <div
        onClick={() => setIsEditing(true)}
        className={cn(
            "cursor-pointer hover:bg-white/80 hover:shadow-sm hover:scale-105 transition-all p-1 rounded px-2 min-h-[24px] flex items-center justify-end border border-transparent hover:border-slate-100",
            textClass, cellBg
        )}
      >
        {isPositive ? Number(value).toLocaleString() : "-"}
      </div>
    );
  };

  const CategoryRow = ({ category, type }) => {
    const isExpanded = expandedRows[category.id];
    const isExpense = type === 'expenses';
    const catMonthlyTotals = Array(12).fill(0);
    category.subItems.forEach(sub => {
      sub.monthly.forEach((val, idx) => catMonthlyTotals[idx] += (Number(val) || 0));
    });
    const catTotal = catMonthlyTotals.reduce((a, b) => a + b, 0);

    return (
      <>
        <tr className={`hover:bg-slate-50 transition-colors border-b border-slate-100 ${isExpanded ? 'bg-slate-50' : ''}`}>
          <td colSpan={2}
            className="p-3 sticky right-0 bg-white md:bg-transparent z-10 font-bold text-slate-800 flex items-center gap-2 cursor-pointer border-l shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]"
            onClick={() => toggleRow(category.id)}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            {category.name}
            <span className="text-xs font-normal text-slate-400 mr-2">({category.subItems.length})</span>
          </td>
          <td className="p-2 border-l border-slate-100 hidden md:table-cell"></td> {/* Space for Value Date column in header */}
          {catMonthlyTotals.map((val, idx) => (
            <td key={idx} className="p-3 text-left text-sm text-slate-500 font-mono min-w-[80px] bg-slate-50/30 border-l border-slate-100/50">
              {val > 0 ? val.toLocaleString() : "-"}
            </td>
          ))}
          <td className={`p-3 text-left font-bold font-mono min-w-[100px] ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
            {catTotal.toLocaleString()}
          </td>
          <td></td>
        </tr>

        {isExpanded && category.subItems.map(sub => {
           const statusConfig = statusOptions[sub.status];
           const method = paymentMethods.find(m => m.id === sub.paymentMethod);

           return (
            <tr key={sub.id} className="border-b border-slate-100 text-xs animate-in slide-in-from-top-1 duration-200 group hover:bg-slate-50">
              <td className="p-2 pr-8 sticky right-0 bg-slate-50 md:bg-transparent z-10 border-l border-slate-100 min-w-[200px]">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-slate-700">{sub.name}</span>
                  {sub.paymentMethod === 'check' && sub.checkNumber && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> צ'ק {sub.checkNumber}
                    </span>
                  )}
                </div>
              </td>
              <td className="p-2 min-w-[140px] border-l border-slate-100">
                <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-1 text-slate-600" title={method?.label}>
                      {getMethodIcon(sub.paymentMethod)}
                      <span className="text-[11px]">{method?.label}</span>
                   </div>
                   <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      יעד: {sub.dueDate ? format(sub.dueDate, 'dd/MM') : '-'}
                   </div>
                </div>
              </td>

              {/* Value Date Column */}
              <td className="p-2 border-l border-slate-100 text-center min-w-[100px] hidden md:table-cell">
                 {sub.valueDate ? (
                    <div className="flex flex-col items-center">
                        <span className="font-mono font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                            {format(sub.valueDate, 'dd/MM/yy')}
                        </span>
                    </div>
                 ) : (
                    <span className="text-slate-300 text-[10px]">-</span>
                 )}
              </td>

              {sub.monthly.map((val, idx) => (
                <td key={idx} className="p-2 text-left font-mono border-l border-slate-100/50 hover:bg-white transition-colors">
                  <EditableCell
                     value={val}
                     isExpense={isExpense}
                     status={sub.status}
                     onChange={(newValue) => handleCellValueChange(selectedYear, type === 'income' ? 'income' : 'expenses', category.id, sub.id, idx, newValue)}
                  />
                </td>
              ))}

              <td className="p-2 text-left font-semibold text-slate-700 font-mono bg-slate-100/50">
                {sub.monthly.reduce((a, b) => a + (Number(b)||0), 0).toLocaleString()}
              </td>

              <td className="p-2 text-center">
                <button
                    onClick={() => cycleStatus(selectedYear, type === 'expenses' ? 'expenses' : 'income', category.id, sub.id)}
                    className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all hover:scale-105 active:scale-95 mx-auto w-fit",
                        statusConfig.color, statusConfig.bg, statusConfig.border
                    )}
                >
                    <div className={cn("w-1.5 h-1.5 rounded-full", statusConfig.color.replace('text-', 'bg-'))}></div>
                    <span className="text-[10px] font-bold">{statusConfig.label}</span>
                </button>
              </td>
            </tr>
          );
        })}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-2 md:p-6 font-sans" dir="rtl">

      {/* Floating Action Button (FAB) - Morning Style */}
      <div className="fixed bottom-8 left-8 z-50">
         <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
                <Button className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-300 flex items-center justify-center transition-transform hover:scale-110">
                    <Plus className="w-8 h-8 text-white" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" dir="rtl">
                <DialogHeader>
                    <DialogTitle>הוספת תנועה חדשה</DialogTitle>
                </DialogHeader>
                {/* Modal Form */}
                <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>סוג תנועה</Label>
                                <Select
                                    value={newTransaction.type}
                                    onValueChange={(val) => setNewTransaction(prev => ({ ...prev, type: val, categoryId: "" }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="income">הכנסה</SelectItem>
                                        <SelectItem value="expenses">הוצאה</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>חודש לחיוב</Label>
                                <Select
                                    value={newTransaction.monthIndex.toString()}
                                    onValueChange={(val) => setNewTransaction(prev => ({ ...prev, monthIndex: parseInt(val) }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>קטגוריה (תקציב)</Label>
                            <Select
                                value={newTransaction.categoryId}
                                onValueChange={(val) => setNewTransaction(prev => ({ ...prev, categoryId: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="בחר קטגוריה..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {(newTransaction.type === "income" ? currentYearData.income : currentYearData.expenses).map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>לקוח / ספק</Label>
                            {newTransaction.isNewClient ? (
                                <div className="flex gap-2 animate-in fade-in zoom-in-95 duration-200">
                                    <Input
                                        placeholder="שם הלקוח החדש..."
                                        value={newTransaction.newClientName}
                                        onChange={(e) => setNewTransaction(prev => ({ ...prev, newClientName: e.target.value }))}
                                    />
                                    <Button variant="outline" onClick={() => setNewTransaction(prev => ({ ...prev, isNewClient: false }))}>ביטול</Button>
                                </div>
                            ) : (
                                <Select
                                    value={newTransaction.client}
                                    onValueChange={(val) => {
                                        if (val === "NEW_CLIENT") {
                                            setNewTransaction(prev => ({ ...prev, isNewClient: true }));
                                        } else {
                                            setNewTransaction(prev => ({ ...prev, client: val }));
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="בחר לקוח..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        <SelectItem value="NEW_CLIENT" className="font-bold text-indigo-600 border-t mt-1">
                                            + יצירת לקוח חדש
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>סכום (₪)</Label>
                                <Input
                                    type="number"
                                    value={newTransaction.amount}
                                    onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>אמצעי תשלום</Label>
                                <Select
                                    value={newTransaction.paymentMethod}
                                    onValueChange={(val) => setNewTransaction(prev => ({ ...prev, paymentMethod: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {paymentMethods.map(m => (
                                            <SelectItem key={m.id} value={m.id}>
                                                <div className="flex items-center gap-2">
                                                    <m.icon className="w-4 h-4" /> {m.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {newTransaction.paymentMethod === "check" && (
                             <div className="space-y-2">
                                <Label className="text-xs">מספר צ'ק</Label>
                                <Input
                                    className="h-8 bg-white"
                                    value={newTransaction.checkNumber}
                                    onChange={(e) => setNewTransaction(prev => ({ ...prev, checkNumber: e.target.value }))}
                                />
                             </div>
                        )}

                        {/* Due Date and Value Date Field */}
                        <div className="grid grid-cols-2 gap-4 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                            <div className="space-y-2">
                                <Label className="text-xs text-indigo-900 font-bold flex items-center gap-1">
                                    <CalendarIcon className="w-3 h-3" /> תאריך יעד
                                </Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("w-full h-8 justify-start text-left font-normal bg-white border-indigo-200", !newTransaction.depositDate && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                                            {newTransaction.depositDate ? format(newTransaction.depositDate, "P", { locale: he }) : <span className="text-xs">בחר תאריך</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={newTransaction.depositDate}
                                            onSelect={(date) => setNewTransaction(prev => ({ ...prev, depositDate: date }))}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                             <div className="space-y-2">
                                <Label className="text-xs text-indigo-900 font-bold flex items-center gap-1">
                                    <CalendarIcon className="w-3 h-3" /> תאריך ערך (בבנק)
                                </Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("w-full h-8 justify-start text-left font-normal bg-white border-indigo-200", !newTransaction.valueDate && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                                            {newTransaction.valueDate ? format(newTransaction.valueDate, "P", { locale: he }) : <span className="text-xs">תאריך פירעון בפועל</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={newTransaction.valueDate}
                                            onSelect={(date) => setNewTransaction(prev => ({ ...prev, valueDate: date }))}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>סטטוס ראשוני</Label>
                            <Select
                                value={newTransaction.status}
                                onValueChange={(val) => setNewTransaction(prev => ({ ...prev, status: val }))}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="forecast">צפי (טיוטה)</SelectItem>
                                    <SelectItem value="pending">הופקד (ממתין)</SelectItem>
                                    <SelectItem value="cleared">נפרע (סופי)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>ביטול</Button>
                    <Button onClick={handleSaveTransaction} className="bg-indigo-600 hover:bg-indigo-700">שמור תנועה</Button>
                </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>

      <div className="max-w-[1900px] mx-auto space-y-8 pb-20">

        {/* Header Section */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
             <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-20 rounded-full"></div>
                <div className="w-14 h-14 bg-gradient-to-tr from-[#4720B7] to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg relative z-10">
                    <Wallet className="w-7 h-7 text-white" />
                </div>
             </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight" style={{fontFamily: 'Heebo, sans-serif'}}>תזרים מזומנים</h1>
              <p className="text-slate-500 font-medium">ניהול פיננסי חכם למנהלים</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
             <Button
                variant="outline"
                onClick={handleReset}
                className="gap-2 text-slate-400 hover:text-red-500 hover:bg-red-50 border-slate-200"
              >
                <RotateCcw className="w-4 h-4" />
                אפס הכל
              </Button>

            <Tabs value={selectedYear} onValueChange={setSelectedYear} className="w-full sm:w-auto">
              <TabsList className="bg-slate-100 p-1 h-11 w-full sm:w-auto grid grid-cols-3 sm:flex">
                {years.map(year => (
                  <TabsTrigger
                    key={year}
                    value={year}
                    className="px-6 data-[state=active]:bg-white data-[state=active]:text-[#4720B7] data-[state=active]:shadow-sm font-bold rounded-md transition-all"
                  >
                    {year}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <BackHomeButtons />
          </div>
        </div>

        {/* Xero-Style KPI Cards - Clean & Minimal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-white overflow-hidden group">
            <CardContent className="p-6">
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">נכנס (Money In)</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-emerald-500 tracking-tight">{formatCurrency(incomeStats.total)}</span>
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                    </div>
                </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-white overflow-hidden group">
            <CardContent className="p-6">
                 <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">יצא (Money Out)</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-rose-500 tracking-tight">{formatCurrency(expensesStats.total)}</span>
                        <TrendingDown className="w-5 h-5 text-rose-500" />
                    </div>
                </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-[#4720B7] text-white overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardContent className="p-6 relative z-10">
                 <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest">יתרה צפויה (Projected)</span>
                    <div className="flex items-baseline gap-2">
                        <span className={cn("text-4xl font-black tracking-tight", endOfYearBalance < 0 ? "text-rose-200" : "text-white")}>
                            {formatCurrency(endOfYearBalance)}
                        </span>
                    </div>
                </div>
            </CardContent>
          </Card>
        </div>

        {/* Bar Chart - Income vs Expenses */}
        <div className="grid grid-cols-1 gap-6">
            <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-0">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-[#4720B7]" />
                    הכנסות מול הוצאות (Income vs Expenses)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full mt-4" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => `₪${val/1000}k`} />
                    <RechartsTooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => formatCurrency(value)}
                        cursor={{ fill: '#f8fafc' }}
                    />
                    <Legend />
                    <Bar dataKey="income" name="הכנסות" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="expenses" name="הוצאות" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
                </div>
            </CardContent>
            </Card>
        </div>


        {/* Data Grid */}
        <Card className="border-0 shadow-md overflow-hidden bg-white">
          <CardHeader className="bg-white border-b border-slate-100 px-6 py-4">
            <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-500" />
                פירוט תנועות (Transaction Grid)
                </CardTitle>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full">
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-300"></div> צפי (Forecast)</span>
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-400"></div> ממתין (Pending)</span>
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> נפרע (Cleared)</span>
                </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
                  <th colSpan={2} className="p-4 text-right font-bold min-w-[220px] sticky right-0 bg-slate-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">פרטי תנועה</th>
                  <th className="p-4 text-center font-bold min-w-[100px] text-indigo-800 hidden md:table-cell">ת. ערך</th>
                  {months.map(m => <th key={m} className="p-4 text-left font-bold min-w-[80px]">{m}</th>)}
                  <th className="p-4 text-left font-bold min-w-[120px] text-indigo-700 bg-indigo-50/30">סה"כ שנתי</th>
                  <th className="p-4 text-center font-bold min-w-[100px]">סטטוס</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">

                {/* Income */}
                <tr className="bg-emerald-50/30">
                  <td colSpan={17} className="p-3 font-bold text-emerald-800 sticky right-0 bg-emerald-50/90 z-10 text-sm tracking-wide">הכנסות (Income)</td>
                </tr>
                {currentYearData.income.map(cat => <CategoryRow key={cat.id} category={cat} type="income" />)}

                {/* Expenses */}
                <tr className="bg-rose-50/30">
                  <td colSpan={17} className="p-3 font-bold text-rose-800 sticky right-0 bg-rose-50/90 z-10 text-sm tracking-wide mt-8">הוצאות (Expenses)</td>
                </tr>
                {currentYearData.expenses.map(cat => <CategoryRow key={cat.id} category={cat} type="expenses" />)}

                {/* Monthly Net */}
                <tr className="bg-white font-semibold text-slate-600 border-t-4 border-slate-100 mt-4">
                    <td colSpan={2} className="p-4 sticky right-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">תזרים נטו חודשי</td>
                    <td className="hidden md:table-cell"></td>
                    {cumulativeData.map((data, idx) => (
                        <td key={idx} className={`p-4 text-left font-mono ${data.monthlyNet >= 0 ? 'text-slate-700' : 'text-rose-600'}`}>
                            {data.monthlyNet.toLocaleString()}
                        </td>
                    ))}
                    <td className="p-4 text-left font-mono font-bold text-slate-800">
                        {(incomeStats.total - expensesStats.total).toLocaleString()}
                    </td>
                    <td></td>
                </tr>

                {/* Cumulative Balance Row */}
                <tr className="bg-[#4720B7] text-white font-bold text-base shadow-lg transform scale-[1.002]">
                  <td colSpan={2} className="p-4 sticky right-0 bg-[#4720B7] z-10 flex items-center gap-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]">
                    <Wallet className="w-5 h-5 text-indigo-200" />
                    יתרה מצטברת (Balance)
                  </td>
                  <td className="bg-[#4720B7] hidden md:table-cell"></td>
                  {cumulativeData.map((data, idx) => (
                    <td key={idx} className={`p-4 text-left font-mono relative group`}>
                      <span className={data.cumulative < 0 ? "text-rose-200" : "text-white"}>
                         {data.cumulative.toLocaleString()}
                      </span>
                    </td>
                  ))}
                  <td className="p-4 text-left font-mono bg-indigo-900/30">
                    {endOfYearBalance.toLocaleString()}
                  </td>
                  <td></td>
                </tr>

              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}