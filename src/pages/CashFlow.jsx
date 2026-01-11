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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, Line, ComposedChart 
} from "recharts";
import { 
  TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronRight, 
  FileText, PieChart, RotateCcw, Plus, Check, Calendar as CalendarIcon,
  CreditCard, Banknote, Landmark, Smartphone
} from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";

// --- Mock Data & Constants ---
const generateMonthlyData = (min, max) => {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * (max - min + 1)) + min);
};

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

const initialClients = [
  "עיריית תל אביב",
  "רשת אורט",
  "מתנ\"ס גבעתיים",
  "אינטל ישראל",
  "לקוח פרטי - משה כהן"
];

// Initial Data Structure
const createInitialData = () => {
  const data = {};
  
  years.forEach(year => {
    data[year] = {
      openingBalance: 0,
      income: [
        { 
          id: "inc1", 
          name: "משרד החינוך", 
          subItems: [
            { 
              id: "inc1-1", 
              name: "מענק בסיס - ינואר", 
              monthly: [15000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
              status: "actual",
              paymentMethod: "bank",
              dueDate: new Date(Number(year), 0, 15)
            },
            { 
              id: "inc1-2", 
              name: "תקציב פרויקטים", 
              monthly: [0, 0, 25000, 0, 0, 0, 0, 0, 0, 0, 0, 0],
              status: "forecast",
              paymentMethod: "bank",
              dueDate: new Date(Number(year), 2, 10)
            }
          ]
        },
        { 
          id: "inc2", 
          name: "לקוחות פרטיים", 
          subItems: [
            { 
              id: "inc2-1", 
              name: "סדנת קיץ - קבוצה א'", 
              monthly: [0, 0, 0, 0, 0, 0, 12000, 0, 0, 0, 0, 0],
              status: "forecast",
              paymentMethod: "bit",
              dueDate: new Date(Number(year), 6, 20)
            }
          ]
        },
        { id: "inc3", name: "מתנ\"סים", subItems: [] },
        { id: "inc4", name: "מוסדות", subItems: [] }
      ],
      expenses: [
        { 
          id: "exp1", 
          name: "הנהלה וכלליות", 
          subItems: [
            { 
              id: "exp1-1", 
              name: "שכירות משרד - שנתי", 
              monthly: Array(12).fill(4000), 
              status: "actual",
              paymentMethod: "bank",
              dueDate: new Date(Number(year), 0, 1)
            }
          ]
        },
        { id: "exp2", name: "שיווק ומכירות", subItems: [] },
        { id: "exp3", name: "שכר (קריטי)", subItems: [] },
        { id: "exp4", name: "תפעול", subItems: [] },
        { id: "exp5", name: "מימון", subItems: [] }
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
  const [selectedYear, setSelectedYear] = useState("2024");
  const [expandedRows, setExpandedRows] = useState({});
  const [clients, setClients] = useState(initialClients);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    type: "income", // or 'expenses'
    client: "",
    isNewClient: false,
    newClientName: "",
    amount: "",
    categoryId: "",
    paymentMethod: "bank",
    checkNumber: "",
    depositDate: undefined,
    status: "forecast",
    monthIndex: new Date().getMonth() // default to current month
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
    // Validate
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
        // Create monthly array with value only at the selected month
        const monthlyArr = Array(12).fill(0);
        monthlyArr[newTransaction.monthIndex] = Number(newTransaction.amount);

        const newSubItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: clientName,
          monthly: monthlyArr,
          status: newTransaction.status,
          paymentMethod: newTransaction.paymentMethod,
          checkNumber: newTransaction.checkNumber,
          depositDate: newTransaction.depositDate,
          dueDate: new Date(Number(selectedYear), newTransaction.monthIndex, 1) // Approx due date
        };

        category.subItems.push(newSubItem);
        // Auto expand the category to show the new item
        setExpandedRows(prev => ({ ...prev, [category.id]: true }));
      }
      
      return newData;
    });

    setIsModalOpen(false);
    // Reset form partially
    setNewTransaction(prev => ({ ...prev, amount: "", isNewClient: false, newClientName: "" }));
  };

  const toggleStatus = (year, type, categoryId, subItemId) => {
    setCashFlowData(prev => {
      const newData = { ...prev };
      const collection = type === 'income' ? newData[year].income : newData[year].expenses;
      const category = collection.find(c => c.id === categoryId);
      const subItem = category.subItems.find(s => s.id === subItemId);
      if (subItem) {
        subItem.status = subItem.status === 'forecast' ? 'actual' : 'forecast';
      }
      return newData;
    });
  };

  const currentYearData = cashFlowData[selectedYear];
  const incomeStats = useMemo(() => calculateGrandTotal(currentYearData.income), [currentYearData]);
  const expensesStats = useMemo(() => calculateGrandTotal(currentYearData.expenses), [currentYearData]);
  
  // Calculate Cumulative Balance
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

  // Chart Data
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

  const CategoryRow = ({ category, type }) => {
    const isExpanded = expandedRows[category.id];
    const isExpense = type === 'expenses';

    // Calculate totals for this category row
    const catMonthlyTotals = Array(12).fill(0);
    category.subItems.forEach(sub => {
      sub.monthly.forEach((val, idx) => catMonthlyTotals[idx] += (Number(val) || 0));
    });
    const catTotal = catMonthlyTotals.reduce((a, b) => a + b, 0);

    return (
      <>
        {/* Category Header Row */}
        <tr 
          className={`hover:bg-slate-50 transition-colors border-b border-slate-100 ${isExpanded ? 'bg-slate-50' : ''}`}
        >
          <td colSpan={2}
            className="p-3 sticky right-0 bg-white md:bg-transparent z-10 font-bold text-slate-800 flex items-center gap-2 cursor-pointer border-l"
            onClick={() => toggleRow(category.id)}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            {category.name}
            <span className="text-xs font-normal text-slate-400 mr-2">({category.subItems.length} תנועות)</span>
          </td>
          {catMonthlyTotals.map((val, idx) => (
            <td key={idx} className="p-3 text-left text-sm text-slate-500 font-mono min-w-[80px] bg-slate-50/30">
              {val > 0 ? val.toLocaleString() : "-"}
            </td>
          ))}
          <td className={`p-3 text-left font-bold font-mono min-w-[100px] ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
            {catTotal.toLocaleString()}
          </td>
          <td></td>
        </tr>

        {/* Sub-items (Transactions) */}
        {isExpanded && category.subItems.map(sub => {
           const isForecast = sub.status === 'forecast';
           const rowClass = isForecast ? "text-slate-500 italic" : "text-slate-900 font-bold bg-slate-50/50";
           const method = paymentMethods.find(m => m.id === sub.paymentMethod);

           return (
            <tr key={sub.id} className={`border-b border-slate-100 text-xs animate-in slide-in-from-top-1 duration-200 group hover:bg-slate-100/50`}>
              <td className="p-2 pr-8 sticky right-0 bg-slate-50 md:bg-transparent z-10 border-l border-slate-100 min-w-[200px]">
                <div className="flex flex-col">
                  <span className={cn("text-sm", rowClass)}>{sub.name}</span>
                  {sub.paymentMethod === 'check' && sub.checkNumber && (
                    <span className="text-[10px] text-slate-400">צ'ק מס': {sub.checkNumber}</span>
                  )}
                </div>
              </td>
              <td className="p-2 min-w-[140px] border-l border-slate-100">
                <div className="flex items-center gap-2 text-slate-600">
                  <div className="p-1 bg-white rounded border border-slate-200" title={method?.label}>
                    {getMethodIcon(sub.paymentMethod)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] opacity-70">תאריך יעד:</span>
                    <span>{sub.dueDate ? format(sub.dueDate, 'dd/MM') : '-'}</span>
                  </div>
                </div>
              </td>
              
              {sub.monthly.map((val, idx) => (
                <td key={idx} className="p-2 text-left font-mono border-l border-slate-100/50">
                  {val > 0 ? (
                    <span className={cn(isForecast && "opacity-70")}>{val.toLocaleString()}</span>
                  ) : ""}
                </td>
              ))}
              
              <td className="p-2 text-left font-semibold text-slate-700 font-mono bg-slate-100/50">
                {sub.monthly.reduce((a, b) => a + (Number(b)||0), 0).toLocaleString()}
              </td>
              
              <td className="p-2 text-center">
                 {isForecast ? (
                   <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-700"
                    onClick={() => toggleStatus(selectedYear, type === 'expenses' ? 'expenses' : 'income', category.id, sub.id)}
                    title="סמן כשולם (הפוך לבפועל)"
                   >
                     <Check className="w-4 h-4" />
                   </Button>
                 ) : (
                    <div className="flex justify-center">
                        <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold">שולם</span>
                    </div>
                 )}
              </td>
            </tr>
          );
        })}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-2 md:p-8 font-sans" dir="rtl">
      <div className="max-w-[1900px] mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 transform rotate-3">
              <PieChart className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">מרכז שליטה פיננסי</h1>
              <p className="text-slate-500 font-medium">ניהול תזרים, תקציב וצפי שנתי</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
             <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                    <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200">
                        <Plus className="w-4 h-4" />
                        הוסף תנועה חדשה
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>הוספת תנועה חדשה</DialogTitle>
                    </DialogHeader>
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
                             <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="space-y-2">
                                    <Label className="text-xs">מספר צ'ק</Label>
                                    <Input 
                                        className="h-8 bg-white"
                                        value={newTransaction.checkNumber}
                                        onChange={(e) => setNewTransaction(prev => ({ ...prev, checkNumber: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">תאריך פירעון</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn("w-full h-8 justify-start text-left font-normal bg-white", !newTransaction.depositDate && "text-muted-foreground")}
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
                             </div>
                        )}

                        <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                            <div className="space-y-0.5">
                                <Label>סטטוס תנועה</Label>
                                <div className="text-xs text-muted-foreground">
                                    {newTransaction.status === 'forecast' ? 'מוגדר כ"צפי" (לא סופי)' : 'מוגדר כ"בפועל" (כסף בבנק)'}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn("text-xs font-medium", newTransaction.status === 'forecast' ? "text-slate-900" : "text-slate-400")}>צפי</span>
                                <Switch 
                                    checked={newTransaction.status === 'actual'}
                                    onCheckedChange={(checked) => setNewTransaction(prev => ({ ...prev, status: checked ? 'actual' : 'forecast' }))}
                                />
                                <span className={cn("text-xs font-medium", newTransaction.status === 'actual' ? "text-green-600" : "text-slate-400")}>בפועל</span>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>ביטול</Button>
                        <Button onClick={handleSaveTransaction} className="bg-indigo-600 hover:bg-indigo-700">שמור תנועה</Button>
                    </DialogFooter>
                </DialogContent>
             </Dialog>

             <Button 
                variant="outline" 
                onClick={handleReset}
                className="gap-2 text-slate-600 hover:text-red-600 hover:bg-red-50 border-slate-200"
              >
                <RotateCcw className="w-4 h-4" />
                אפס נתונים
              </Button>
            
            <Tabs value={selectedYear} onValueChange={setSelectedYear} className="w-full sm:w-auto">
              <TabsList className="bg-slate-100 p-1 h-11 w-full sm:w-auto grid grid-cols-3 sm:flex">
                {years.map(year => (
                  <TabsTrigger 
                    key={year} 
                    value={year}
                    className="px-6 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-bold rounded-md transition-all"
                  >
                    {year}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <BackHomeButtons />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-white overflow-hidden group">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500 group-hover:w-2 transition-all"></div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-slate-400 mb-1 uppercase tracking-wider">סה"כ הכנסות {selectedYear}</p>
                  <h2 className="text-4xl font-black text-emerald-600 tracking-tight">{formatCurrency(incomeStats.total)}</h2>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-white overflow-hidden group">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-rose-500 group-hover:w-2 transition-all"></div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-slate-400 mb-1 uppercase tracking-wider">סה"כ הוצאות {selectedYear}</p>
                  <h2 className="text-4xl font-black text-rose-600 tracking-tight">{formatCurrency(expensesStats.total)}</h2>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl group-hover:scale-110 transition-transform">
                  <TrendingDown className="w-6 h-6 text-rose-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-indigo-600 to-purple-700 text-white overflow-hidden relative group">
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-indigo-100 mb-1 uppercase tracking-wider">יתרה צפויה לסוף שנה</p>
                  <h2 className="text-4xl font-black text-white tracking-tight">{formatCurrency(endOfYearBalance)}</h2>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <Card className="border-0 shadow-sm xl:col-span-4">
            <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-800">מגמת תזרים שנתית</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `₪${val/1000}k`} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#8b5cf6', fontSize: 12 }} />
                    <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => formatCurrency(value)}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="income" name="הכנסות" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                    <Bar yAxisId="left" dataKey="expenses" name="הוצאות" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={30} />
                    <Line yAxisId="right" type="monotone" dataKey="balance" name="יתרה מצטברת" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: "#8b5cf6" }} />
                    </ComposedChart>
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
                <FileText className="w-5 h-5 text-indigo-600" />
                פירוט תנועות חודשי
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-slate-200 rounded-sm"></div>
                        <span>צפי (Forecast)</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-slate-800 rounded-sm"></div>
                        <span>בפועל (Actual)</span>
                    </div>
                </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
                  <th colSpan={2} className="p-4 text-right font-bold min-w-[220px] sticky right-0 bg-slate-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">פרטי תנועה</th>
                  {months.map(m => <th key={m} className="p-4 text-left font-bold min-w-[80px]">{m}</th>)}
                  <th className="p-4 text-left font-bold min-w-[120px] text-indigo-700 bg-indigo-50/30">סה"כ שנתי</th>
                  <th className="p-4 text-center font-bold min-w-[60px]">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                
                {/* Income Section */}
                <tr className="bg-emerald-50/50">
                  <td colSpan={16} className="p-3 font-black text-emerald-800 sticky right-0 bg-emerald-50/90 z-10 text-sm tracking-wide">הכנסות</td>
                </tr>
                {currentYearData.income.map(cat => (
                  <CategoryRow key={cat.id} category={cat} type="income" />
                ))}
                <tr className="bg-emerald-100/50 border-t-2 border-emerald-100 font-bold">
                  <td colSpan={2} className="p-4 sticky right-0 bg-emerald-100 z-10 text-emerald-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">סה"כ הכנסות</td>
                  {incomeStats.monthlyTotals.map((val, idx) => (
                    <td key={idx} className="p-4 text-left font-mono text-emerald-900">{val.toLocaleString()}</td>
                  ))}
                  <td className="p-4 text-left font-mono text-emerald-900 bg-emerald-200/30">{incomeStats.total.toLocaleString()}</td>
                  <td></td>
                </tr>

                {/* Expenses Section */}
                <tr className="bg-rose-50/50">
                  <td colSpan={16} className="p-3 font-black text-rose-800 sticky right-0 bg-rose-50/90 z-10 text-sm tracking-wide mt-8">הוצאות</td>
                </tr>
                {currentYearData.expenses.map(cat => (
                  <CategoryRow key={cat.id} category={cat} type="expenses" />
                ))}
                <tr className="bg-rose-100/50 border-t-2 border-rose-100 font-bold">
                  <td colSpan={2} className="p-4 sticky right-0 bg-rose-100 z-10 text-rose-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">סה"כ הוצאות</td>
                  {expensesStats.monthlyTotals.map((val, idx) => (
                    <td key={idx} className="p-4 text-left font-mono text-rose-900">{val.toLocaleString()}</td>
                  ))}
                  <td className="p-4 text-left font-mono text-rose-900 bg-rose-200/30">{expensesStats.total.toLocaleString()}</td>
                  <td></td>
                </tr>

                {/* Summary Section Header */}
                <tr className="bg-indigo-50/30 border-t border-indigo-100">
                    <td colSpan={16} className="p-2"></td>
                </tr>

                {/* Monthly Net */}
                <tr className="bg-white font-semibold text-slate-600">
                    <td colSpan={2} className="p-4 sticky right-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">רווח/הפסד חודשי</td>
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

                {/* Cumulative Balance Row (The Chain Reaction) */}
                <tr className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white font-bold text-base shadow-lg transform scale-[1.002]">
                  <td colSpan={2} className="p-4 sticky right-0 bg-indigo-600 z-10 flex items-center gap-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]">
                    <Wallet className="w-5 h-5 text-indigo-200" />
                    יתרה מצטברת (תזרים)
                  </td>
                  {cumulativeData.map((data, idx) => (
                    <td key={idx} className={`p-4 text-left font-mono relative group`}>
                      <span className={data.cumulative < 0 ? "text-rose-200" : "text-white"}>
                         {data.cumulative.toLocaleString()}
                      </span>
                      {data.cumulative < 0 && (
                        <div className="absolute inset-0 bg-rose-500/20 pointer-events-none"></div>
                      )}
                    </td>
                  ))}
                  <td className="p-4 text-left font-mono bg-purple-800/50">
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