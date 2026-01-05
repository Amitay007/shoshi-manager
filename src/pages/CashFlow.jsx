import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { 
  DollarSign, Plus, Edit, Trash2, Wallet, TrendingUp, TrendingDown, 
  Settings, Calendar, Tag
} from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { format } from "date-fns";

export default function CashFlow() {
  // Initial mock data
  const [categories, setCategories] = useState([
    { id: 'cat1', name: "מענק משרד החינוך", type: "income", color: "#10b981" },
    { id: 'cat2', name: "מכירת משקפות", type: "income", color: "#059669" },
    { id: 'cat3', name: "רכישת משקפות VR", type: "expense", color: "#ef4444" },
    { id: 'cat4', name: "שכר עובדים", type: "expense", color: "#f97316" },
    { id: 'cat5', name: "פיתוח תוכן", type: "expense", color: "#ec4899" },
    { id: 'cat6', name: "שיווק ומכירות", type: "expense", color: "#8b5cf6" }
  ]);

  const [transactions, setTransactions] = useState([
    { id: 't1', date: "2026-01-15", amount: 250000, categoryId: 'cat1', description: "מענק משרד החינוך Q1", status: "forecast" },
    { id: 't2', date: "2026-01-20", amount: -85000, categoryId: 'cat3', description: "רכישת 20 משקפות Quest 3", status: "forecast" },
    { id: 't3', date: "2026-01-25", amount: 45000, categoryId: 'cat2', description: "מכירה לבית ספר אורט", status: "paid" },
    { id: 't4', date: "2026-01-31", amount: -60000, categoryId: 'cat4', description: "משכורות צוות", status: "paid" },
    { id: 't5', date: "2026-02-05", amount: -25000, categoryId: 'cat5', description: "פיתוח תוכן חינוכי חדש", status: "forecast" },
    { id: 't6', date: "2026-02-10", amount: -15000, categoryId: 'cat6', description: "קמפיין דיגיטלי", status: "forecast" },
    { id: 't7', date: "2026-02-15", amount: 180000, categoryId: 'cat1', description: "מענק חדשנות", status: "forecast" }
  ]);

  const [currentBalance] = useState(320000); // Mock current balance

  // Modals state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Form state
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    type: "income",
    color: "#10b981"
  });

  const [transactionForm, setTransactionForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    categoryId: "",
    description: "",
    status: "forecast"
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    });

    const totalIncome = monthlyTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = Math.abs(
      monthlyTransactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0)
    );

    const plannedIncome = transactions
      .filter(t => t.status === "forecast" && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const plannedExpenses = Math.abs(
      transactions
        .filter(t => t.status === "forecast" && t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0)
    );

    const futureBalance = currentBalance + plannedIncome - plannedExpenses;

    return {
      totalIncome,
      totalExpenses,
      plannedIncome,
      plannedExpenses,
      futureBalance,
      netIncome: totalIncome - totalExpenses
    };
  }, [transactions, currentBalance]);

  // Chart data
  const chartData = [
    {
      name: "הכנסות",
      amount: stats.totalIncome,
      fill: "#10b981"
    },
    {
      name: "הוצאות",
      amount: stats.totalExpenses,
      fill: "#ef4444"
    }
  ];

  // Category CRUD
  const handleSaveCategory = () => {
    if (!categoryForm.name) return;

    if (editingCategory) {
      setCategories(categories.map(c => 
        c.id === editingCategory.id ? { ...editingCategory, ...categoryForm } : c
      ));
    } else {
      setCategories([...categories, {
        id: `cat${Date.now()}`,
        ...categoryForm
      }]);
    }

    resetCategoryForm();
    setShowCategoryModal(false);
  };

  const handleDeleteCategory = (id) => {
    if (!confirm("האם למחוק קטגוריה זו?")) return;
    setCategories(categories.filter(c => c.id !== id));
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: "", type: "income", color: "#10b981" });
    setEditingCategory(null);
  };

  // Transaction CRUD
  const handleSaveTransaction = () => {
    if (!transactionForm.amount || !transactionForm.categoryId) return;

    const amount = transactionForm.amount;
    const category = categories.find(c => c.id === transactionForm.categoryId);
    const finalAmount = category?.type === "expense" ? -Math.abs(amount) : Math.abs(amount);

    if (editingTransaction) {
      setTransactions(transactions.map(t =>
        t.id === editingTransaction.id ? { ...editingTransaction, ...transactionForm, amount: finalAmount } : t
      ));
    } else {
      setTransactions([...transactions, {
        id: `t${Date.now()}`,
        ...transactionForm,
        amount: finalAmount
      }]);
    }

    resetTransactionForm();
    setShowTransactionModal(false);
  };

  const handleDeleteTransaction = (id) => {
    if (!confirm("האם למחוק תנועה זו?")) return;
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      date: new Date().toISOString().slice(0, 10),
      amount: "",
      categoryId: "",
      description: "",
      status: "forecast"
    });
    setEditingTransaction(null);
  };

  const getCategoryById = (id) => categories.find(c => c.id === id);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(Math.abs(amount));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-cyan-50 p-4 sm:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-purple-900">ניהול תזרים מזומנים</h1>
              <p className="text-slate-500 text-xs sm:text-sm">מעקב הכנסות והוצאות עם גמישות מלאה</p>
            </div>
          </div>
          <div className="hidden lg:block">
            <BackHomeButtons />
          </div>
        </div>

        {/* Section A: Structure Editor */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                עורך המבנה
              </CardTitle>
              <Button 
                onClick={() => { resetCategoryForm(); setShowCategoryModal(true); }}
                className="bg-purple-600 hover:bg-purple-700 gap-2"
              >
                <Plus className="w-4 h-4" />
                נהל קטגוריות
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <Badge 
                  key={cat.id}
                  style={{ backgroundColor: cat.color, color: 'white' }}
                  className="px-3 py-1.5 text-sm"
                >
                  {cat.name} ({cat.type === "income" ? "הכנסה" : "הוצאה"})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section B: Visual Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <Card className="lg:col-span-2 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-600" />
                מבט על החודש הנוכחי
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="amount" name="סכום" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="space-y-4">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">יתרה נוכחית</p>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(currentBalance)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">יתרה עתידית צפויה</p>
                    <p className={`text-2xl font-bold ${stats.futureBalance >= 0 ? 'text-purple-900' : 'text-red-900'}`}>
                      {formatCurrency(stats.futureBalance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">הכנסות מתוכננות:</span>
                    <span className="font-semibold text-green-700">{formatCurrency(stats.plannedIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">הוצאות מתוכננות:</span>
                    <span className="font-semibold text-red-700">{formatCurrency(stats.plannedExpenses)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Section C: Transaction Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-600" />
                טבלת תנועות
              </CardTitle>
              <Button 
                onClick={() => { resetTransactionForm(); setShowTransactionModal(true); }}
                className="bg-cyan-600 hover:bg-cyan-700 gap-2"
              >
                <Plus className="w-4 h-4" />
                תנועה חדשה
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">תאריך</TableHead>
                    <TableHead className="text-right">קטגוריה</TableHead>
                    <TableHead className="text-right">תיאור</TableHead>
                    <TableHead className="text-right">סכום</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).map(transaction => {
                    const category = getCategoryById(transaction.categoryId);
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell>{format(new Date(transaction.date), "dd/MM/yyyy")}</TableCell>
                        <TableCell>
                          {category && (
                            <Badge 
                              style={{ backgroundColor: category.color, color: 'white' }}
                              className="text-xs"
                            >
                              {category.name}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                        <TableCell>
                          <span className={transaction.amount >= 0 ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>
                            {formatCurrency(transaction.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={transaction.status === "paid" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}>
                            {transaction.status === "paid" ? "שולם" : "מתוכנן"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setEditingTransaction(transaction);
                                setTransactionForm({
                                  date: transaction.date,
                                  amount: Math.abs(transaction.amount).toString(),
                                  categoryId: transaction.categoryId,
                                  description: transaction.description,
                                  status: transaction.status
                                });
                                setShowTransactionModal(true);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Management Modal */}
      <Dialog open={showCategoryModal} onOpenChange={(open) => { if (!open) resetCategoryForm(); setShowCategoryModal(open); }}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ניהול קטגוריות</DialogTitle>
          </DialogHeader>

          {/* Add/Edit Form */}
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
            <h3 className="font-semibold">{editingCategory ? "ערוך קטגוריה" : "הוסף קטגוריה חדשה"}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">שם קטגוריה</label>
                <Input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                  placeholder="למשל: מענקים"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">סוג</label>
                <Select value={categoryForm.type} onValueChange={(v) => setCategoryForm({...categoryForm, type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">הכנסה</SelectItem>
                    <SelectItem value="expense">הוצאה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">צבע</label>
                <Input
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm({...categoryForm, color: e.target.value})}
                  className="h-10 cursor-pointer"
                />
              </div>
            </div>
            <Button onClick={handleSaveCategory} className="bg-purple-600 hover:bg-purple-700 w-full">
              {editingCategory ? "עדכן" : "הוסף"}
            </Button>
          </div>

          {/* Categories List */}
          <div className="space-y-2 mt-4">
            <h3 className="font-semibold">קטגוריות קיימות</h3>
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: cat.color }}></div>
                  <div>
                    <p className="font-medium">{cat.name}</p>
                    <p className="text-xs text-slate-500">{cat.type === "income" ? "הכנסה" : "הוצאה"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setEditingCategory(cat);
                      setCategoryForm({ name: cat.name, type: cat.type, color: cat.color });
                    }}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleDeleteCategory(cat.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCategoryModal(false); resetCategoryForm(); }}>סגור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Modal */}
      <Dialog open={showTransactionModal} onOpenChange={(open) => { if (!open) resetTransactionForm(); setShowTransactionModal(open); }}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? "ערוך תנועה" : "תנועה חדשה"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">תאריך</label>
                <Input
                  type="date"
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">סכום</label>
                <Input
                  type="number"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">קטגוריה *</label>
              <Select value={transactionForm.categoryId} onValueChange={(v) => setTransactionForm({...transactionForm, categoryId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                        {cat.name} ({cat.type === "income" ? "הכנסה" : "הוצאה"})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">תיאור</label>
              <Input
                value={transactionForm.description}
                onChange={(e) => setTransactionForm({...transactionForm, description: e.target.value})}
                placeholder="תיאור התנועה"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">סטטוס</label>
              <Select value={transactionForm.status} onValueChange={(v) => setTransactionForm({...transactionForm, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="forecast">מתוכנן</SelectItem>
                  <SelectItem value="paid">שולם</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowTransactionModal(false); resetTransactionForm(); }}>ביטול</Button>
            <Button onClick={handleSaveTransaction} className="bg-cyan-600 hover:bg-cyan-700">שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}