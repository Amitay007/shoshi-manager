import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, Line, ComposedChart 
} from "recharts";
import { 
  TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronRight, 
  FileText, PieChart, RotateCcw, Save
} from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";

// --- Mock Data Generator ---
const generateMonthlyData = (min, max) => {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * (max - min + 1)) + min);
};

const years = ["2024", "2025", "2026"];
const months = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
];

// Initial Data Structure
const createInitialData = () => {
  const data = {};
  
  years.forEach(year => {
    data[year] = {
      openingBalance: 0, // Opening balance for the year
      income: [
        { 
          id: "inc1", 
          name: "משרד החינוך", 
          subItems: [
            { id: "inc1-1", name: "מענקים שוטפים", monthly: generateMonthlyData(10000, 50000) },
            { id: "inc1-2", name: "פרויקטים מיוחדים", monthly: generateMonthlyData(5000, 20000) }
          ]
        },
        { 
          id: "inc2", 
          name: "לקוחות פרטיים", 
          subItems: [
            { id: "inc2-1", name: "סדנאות פרטיות", monthly: generateMonthlyData(2000, 15000) },
            { id: "inc2-2", name: "מכירת ציוד", monthly: generateMonthlyData(1000, 8000) }
          ]
        },
        { 
          id: "inc3", 
          name: "מתנ\"סים", 
          subItems: [
            { id: "inc3-1", name: "חוגים שנתיים", monthly: generateMonthlyData(8000, 25000) },
            { id: "inc3-2", name: "אירועי שיא", monthly: generateMonthlyData(3000, 12000) }
          ]
        },
        { 
          id: "inc4", 
          name: "מוסדות", 
          subItems: [
            { id: "inc4-1", name: "בתי ספר תיכוניים", monthly: generateMonthlyData(15000, 40000) },
            { id: "inc4-2", name: "מכללות", monthly: generateMonthlyData(5000, 15000) }
          ]
        }
      ],
      expenses: [
        { 
          id: "exp1", 
          name: "הנהלה וכלליות", 
          subItems: [
            { id: "exp1-1", name: "שכירות משרד", monthly: generateMonthlyData(4000, 4000) },
            { id: "exp1-2", name: "ארנונה וחשמל", monthly: generateMonthlyData(1000, 2000) },
            { id: "exp1-3", name: "כיבוד וניקיון", monthly: generateMonthlyData(500, 1500) }
          ]
        },
        { 
          id: "exp2", 
          name: "שיווק ומכירות", 
          subItems: [
            { id: "exp2-1", name: "קמפיינים דיגיטליים", monthly: generateMonthlyData(3000, 10000) },
            { id: "exp2-2", name: "כנסים", monthly: generateMonthlyData(0, 5000) }
          ]
        },
        { 
          id: "exp3", 
          name: "שכר (קריטי)", 
          subItems: [
            { id: "exp3-1", name: "משכורות בסיס", monthly: generateMonthlyData(40000, 45000) },
            { id: "exp3-2", name: "בונוסים", monthly: generateMonthlyData(0, 10000) },
            { id: "exp3-3", name: "הפרשות סוציאליות", monthly: generateMonthlyData(8000, 10000) }
          ]
        },
        { 
          id: "exp4", 
          name: "תפעול", 
          subItems: [
            { id: "exp4-1", name: "רכש ציוד VR", monthly: generateMonthlyData(5000, 20000) },
            { id: "exp4-2", name: "תחזוקה", monthly: generateMonthlyData(1000, 3000) },
            { id: "exp4-3", name: "רישיונות תוכנה", monthly: generateMonthlyData(2000, 2000) }
          ]
        },
        { 
          id: "exp5", 
          name: "מימון", 
          subItems: [
            { id: "exp5-1", name: "עמלות בנק", monthly: generateMonthlyData(200, 500) },
            { id: "exp5-2", name: "ריבית הלוואות", monthly: generateMonthlyData(1000, 1500) }
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
  const [selectedYear, setSelectedYear] = useState("2024");
  const [expandedRows, setExpandedRows] = useState({});
  const [editingCell, setEditingCell] = useState(null); // { itemId, monthIndex }

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleReset = () => {
    if (confirm("האם אתה בטוח שברצונך לאפס את כל הנתונים לברירת המחדל?")) {
      setCashFlowData(createInitialData());
    }
  };

  const handleCellValueChange = (year, type, categoryId, subItemId, monthIndex, newValue) => {
    const numValue = parseInt(newValue) || 0;
    
    setCashFlowData(prev => {
      const newData = { ...prev };
      const category = newData[year][type].find(c => c.id === categoryId);
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
  
  // Calculate Cumulative Balance (Chain Reaction)
  // Formula: (Previous Balance) + (Income) - (Expense)
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

  const EditableCell = ({ value, onChange, isExpense }) => {
    const [localValue, setLocalValue] = useState(value);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

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
          className="h-8 w-24 p-1 text-xs font-mono bg-white"
        />
      );
    }

    return (
      <div 
        onClick={() => setIsEditing(true)}
        className={`cursor-text hover:bg-slate-100 p-1 rounded px-2 min-h-[24px] flex items-center ${isExpense ? 'text-red-700' : 'text-slate-700'}`}
      >
        {Number(value).toLocaleString()}
      </div>
    );
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
          <td 
            className="p-3 sticky right-0 bg-white md:bg-transparent z-10 font-bold text-slate-800 flex items-center gap-2 cursor-pointer"
            onClick={() => toggleRow(category.id)}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            {category.name}
          </td>
          {catMonthlyTotals.map((val, idx) => (
            <td key={idx} className="p-3 text-left text-sm text-slate-500 font-mono min-w-[80px] bg-slate-50/30">
              {val.toLocaleString()}
            </td>
          ))}
          <td className={`p-3 text-left font-bold font-mono min-w-[100px] ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
            {catTotal.toLocaleString()}
          </td>
        </tr>

        {/* Sub-items (Editable) */}
        {isExpanded && category.subItems.map(sub => (
          <tr key={sub.id} className="bg-slate-50/50 border-b border-slate-100 text-xs animate-in slide-in-from-top-1 duration-200">
            <td className="p-2 pr-8 sticky right-0 bg-slate-50 md:bg-transparent z-10 text-slate-500 font-medium border-l border-slate-100">
              {sub.name}
            </td>
            {sub.monthly.map((val, idx) => (
              <td key={idx} className="p-2 text-left font-mono border-l border-slate-100/50">
                <EditableCell 
                  value={val} 
                  isExpense={isExpense}
                  onChange={(newValue) => handleCellValueChange(selectedYear, type, category.id, sub.id, idx, newValue)}
                />
              </td>
            ))}
            <td className="p-2 text-left font-semibold text-slate-700 font-mono bg-slate-100/50">
              {sub.monthly.reduce((a, b) => a + (Number(b)||0), 0).toLocaleString()}
            </td>
          </tr>
        ))}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-2 md:p-8 font-sans" dir="rtl">
      <div className="max-w-[1800px] mx-auto space-y-8">
        
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
             <Button 
                variant="outline" 
                onClick={handleReset}
                className="gap-2 text-slate-600 hover:text-red-600 hover:bg-red-50 border-slate-200"
              >
                <RotateCcw className="w-4 h-4" />
                אפס לברירת מחדל
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
                <div className="text-sm text-slate-400">
                    * לחץ על תא כדי לערוך
                </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
                  <th className="p-4 text-right font-bold min-w-[220px] sticky right-0 bg-slate-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">קטגוריה</th>
                  {months.map(m => <th key={m} className="p-4 text-left font-bold min-w-[100px]">{m}</th>)}
                  <th className="p-4 text-left font-bold min-w-[120px] text-indigo-700 bg-indigo-50/30">סה"כ שנתי</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                
                {/* Income Section */}
                <tr className="bg-emerald-50/50">
                  <td colSpan={14} className="p-3 font-black text-emerald-800 sticky right-0 bg-emerald-50/90 z-10 text-sm tracking-wide">הכנסות</td>
                </tr>
                {currentYearData.income.map(cat => (
                  <CategoryRow key={cat.id} category={cat} type="income" />
                ))}
                <tr className="bg-emerald-100/50 border-t-2 border-emerald-100 font-bold">
                  <td className="p-4 sticky right-0 bg-emerald-100 z-10 text-emerald-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">סה"כ הכנסות</td>
                  {incomeStats.monthlyTotals.map((val, idx) => (
                    <td key={idx} className="p-4 text-left font-mono text-emerald-900">{val.toLocaleString()}</td>
                  ))}
                  <td className="p-4 text-left font-mono text-emerald-900 bg-emerald-200/30">{incomeStats.total.toLocaleString()}</td>
                </tr>

                {/* Expenses Section */}
                <tr className="bg-rose-50/50">
                  <td colSpan={14} className="p-3 font-black text-rose-800 sticky right-0 bg-rose-50/90 z-10 text-sm tracking-wide mt-8">הוצאות</td>
                </tr>
                {currentYearData.expenses.map(cat => (
                  <CategoryRow key={cat.id} category={cat} type="expenses" />
                ))}
                <tr className="bg-rose-100/50 border-t-2 border-rose-100 font-bold">
                  <td className="p-4 sticky right-0 bg-rose-100 z-10 text-rose-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">סה"כ הוצאות</td>
                  {expensesStats.monthlyTotals.map((val, idx) => (
                    <td key={idx} className="p-4 text-left font-mono text-rose-900">{val.toLocaleString()}</td>
                  ))}
                  <td className="p-4 text-left font-mono text-rose-900 bg-rose-200/30">{expensesStats.total.toLocaleString()}</td>
                </tr>

                {/* Summary Section Header */}
                <tr className="bg-indigo-50/30 border-t border-indigo-100">
                    <td colSpan={14} className="p-2"></td>
                </tr>

                {/* Monthly Net */}
                <tr className="bg-white font-semibold text-slate-600">
                    <td className="p-4 sticky right-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">רווח/הפסד חודשי</td>
                    {cumulativeData.map((data, idx) => (
                        <td key={idx} className={`p-4 text-left font-mono ${data.monthlyNet >= 0 ? 'text-slate-700' : 'text-rose-600'}`}>
                            {data.monthlyNet.toLocaleString()}
                        </td>
                    ))}
                    <td className="p-4 text-left font-mono font-bold text-slate-800">
                        {(incomeStats.total - expensesStats.total).toLocaleString()}
                    </td>
                </tr>

                {/* Cumulative Balance Row (The Chain Reaction) */}
                <tr className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white font-bold text-base shadow-lg transform scale-[1.002]">
                  <td className="p-4 sticky right-0 bg-indigo-600 z-10 flex items-center gap-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]">
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
                </tr>

              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}