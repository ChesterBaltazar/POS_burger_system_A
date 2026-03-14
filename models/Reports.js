import mongoose from 'mongoose';

const salesReportSchema = new mongoose.Schema({
    reportName: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        required: true,
        index: true
    },
    period: {
        type: String,
        enum: ['yearly', 'monthly', 'weekly', 'daily'],
        default: 'yearly'
    },
    
    // Monthly breakdown for the entire year
    monthlyBreakdown: [{
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12
        },
        monthName: {
            type: String,
            required: true
        },
        revenue: {
            type: Number,
            default: 0,
            min: 0
        },
        unitsSold: {
            type: Number,
            default: 0,
            min: 0
        },
        orders: {
            type: Number,
            default: 0,
            min: 0
        },
        profit: {
            type: Number,
            default: 0,
            min: 0
        }
    }],
    
    // Weekly breakdown
    weeklyBreakdown: [{
        day: {
            type: Number,
            required: true,
            min: 1,
            max: 7
        },
        dayName: {
            type: String,
            required: true
        },
        revenue: {
            type: Number,
            default: 0,
            min: 0
        },
        unitsSold: {
            type: Number,
            default: 0,
            min: 0
        },
        orders: {
            type: Number,
            default: 0,
            min: 0
        }
    }],
    
    // Product sales data
    products: [{
        productName: {
            type: String,
            required: true
        },
        unitsSold: {
            type: Number,
            default: 0,
            min: 0
        },
        revenue: {
            type: Number,
            default: 0,
            min: 0
        },
        profit: {
            type: Number,
            default: 0,
            min: 0
        },
        profitMargin: {
            type: Number,
            default: 50,
            min: 0,
            max: 100
        },
        userName: {
            type: String,
            default: 'System'
        }
    }],
    
    // Summary statistics
    summary: {
        totalRevenue: {
            type: Number,
            default: 0,
            min: 0
        },
        totalProfit: {
            type: Number,
            default: 0,
            min: 0
        },
        totalItems: {
            type: Number,
            default: 0,
            min: 0
        },
        totalOrders: {
            type: Number,
            default: 0,
            min: 0
        },
        averageOrderValue: {
            type: Number,
            default: 0,
            min: 0
        },
        averageItemsPerOrder: {
            type: Number,
            default: 0,
            min: 0
        },
        cashiers: [{
            userName: String,
            totalRevenue: Number,
            totalItems: Number,
            totalOrders: Number,
            averageOrderValue: Number
        }]
    },
    
    // Performance metrics
    performance: {
        summary: {
            type: String,
            enum: ['Excellent', 'Good', 'Average', 'Poor'],
            default: 'Average'
        },
        calculated: {
            totalRevenue: {
                type: Number,
                default: 0
            },
            totalUnits: {
                type: Number,
                default: 0
            },
            avgRevenuePerUnit: {
                type: Number,
                default: 0
            },
            bestSeller: {
                type: String,
                default: 'None'
            },
            worstSeller: {
                type: String,
                default: 'None'
            }
        },
        comparison: {
            previousPeriodGrowth: {
                type: Number,
                default: 0
            },
            vsTarget: {
                type: Number,
                default: 0
            }
        }
    }
}, {
    timestamps: true
});

// Pre-save middleware to calculate metrics
salesReportSchema.pre('save', function(next) {
    if (this.products && this.products.length > 0) {
        const totalRevenue = this.products.reduce((sum, p) => sum + (p.revenue || 0), 0);
        const totalUnits = this.products.reduce((sum, p) => sum + (p.unitsSold || 0), 0);
        
        this.performance.calculated = {
            totalRevenue,
            totalUnits,
            avgRevenuePerUnit: totalUnits > 0 ? totalRevenue / totalUnits : 0,
            bestSeller: 'None',
            worstSeller: 'None'
        };
        
        if (this.products.length > 0) {
            const sorted = [...this.products].sort((a, b) => (b.unitsSold || 0) - (a.unitsSold || 0));
            this.performance.calculated.bestSeller = sorted[0]?.productName || 'None';
            this.performance.calculated.worstSeller = sorted[sorted.length - 1]?.productName || 'None';
        }
        
        const growth = this.performance.comparison?.previousPeriodGrowth || 0;
        if (growth >= 20) {
            this.performance.summary = 'Excellent';
        } else if (growth >= 10) {
            this.performance.summary = 'Good';
        } else if (growth >= 0) {
            this.performance.summary = 'Average';
        } else {
            this.performance.summary = 'Poor';
        }
    }
    
    next();
});

// Static method to get or create yearly report
salesReportSchema.statics.getYearlyReport = async function(year) {
    try {
        let report = await this.findOne({ year, period: 'yearly' });
        
        if (!report) {
            report = new this({
                reportName: `Sales Report ${year}`,
                year: year,
                period: 'yearly',
                monthlyBreakdown: [],
                weeklyBreakdown: [],
                products: [],
                summary: {
                    totalRevenue: 0,
                    totalProfit: 0,
                    totalItems: 0,
                    totalOrders: 0,
                    averageOrderValue: 0,
                    averageItemsPerOrder: 0,
                    cashiers: []
                },
                performance: {
                    summary: 'Average',
                    calculated: {
                        totalRevenue: 0,
                        totalUnits: 0,
                        avgRevenuePerUnit: 0,
                        bestSeller: 'None',
                        worstSeller: 'None'
                    },
                    comparison: {
                        previousPeriodGrowth: 0,
                        vsTarget: 0
                    }
                }
            });
            
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
            
            for (let i = 1; i <= 12; i++) {
                report.monthlyBreakdown.push({
                    month: i,
                    monthName: monthNames[i - 1],
                    revenue: 0,
                    unitsSold: 0,
                    orders: 0,
                    profit: 0
                });
            }
            
            const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            for (let i = 1; i <= 7; i++) {
                report.weeklyBreakdown.push({
                    day: i,
                    dayName: dayNames[i - 1],
                    revenue: 0,
                    unitsSold: 0,
                    orders: 0
                });
            }
            
            await report.save();
        }
        
        return report;
        
    } catch (error) {
        console.error(`Error getting yearly report for ${year}:`, error);
        throw error;
    }
};

// Method to update report with order data
salesReportSchema.methods.updateWithOrder = async function(orderData) {
    try {
        const orderDate = new Date(orderData.createdAt);
        const month = orderDate.getMonth() + 1;
        const day = orderDate.getDay() || 7;
        
        this.summary.totalRevenue += orderData.total || 0;
        this.summary.totalProfit += (orderData.total || 0) * 0.5;
        this.summary.totalItems += orderData.items?.length || 0;
        this.summary.totalOrders += 1;
        
        if (this.summary.totalOrders > 0) {
            this.summary.averageOrderValue = this.summary.totalRevenue / this.summary.totalOrders;
            this.summary.averageItemsPerOrder = this.summary.totalItems / this.summary.totalOrders;
        }
        
        const monthData = this.monthlyBreakdown.find(m => m.month === month);
        if (monthData) {
            monthData.revenue += orderData.total || 0;
            monthData.unitsSold += orderData.items?.length || 0;
            monthData.orders += 1;
            monthData.profit += (orderData.total || 0) * 0.5;
        }
        
        const weekData = this.weeklyBreakdown.find(w => w.day === day);
        if (weekData) {
            weekData.revenue += orderData.total || 0;
            weekData.unitsSold += orderData.items?.length || 0;
            weekData.orders += 1;
        }
        
        if (orderData.items && orderData.items.length > 0) {
            for (const item of orderData.items) {
                let product = this.products.find(p => p.productName === item.name);
                
                if (!product) {
                    product = {
                        productName: item.name,
                        unitsSold: 0,
                        revenue: 0,
                        profit: 0,
                        profitMargin: 50,
                        userName: orderData.userId?.username || 'System'
                    };
                    this.products.push(product);
                }
                
                product.unitsSold += item.quantity || 1;
                product.revenue += item.subtotal || item.price || 0;
                product.profit += (item.subtotal || item.price || 0) * 0.5;
            }
        }
        
        if (orderData.userId?.username) {
            let cashier = this.summary.cashiers.find(c => c.userName === orderData.userId.username);
            
            if (!cashier) {
                cashier = {
                    userName: orderData.userId.username,
                    totalRevenue: 0,
                    totalItems: 0,
                    totalOrders: 0,
                    averageOrderValue: 0
                };
                this.summary.cashiers.push(cashier);
            }
            
            cashier.totalRevenue += orderData.total || 0;
            cashier.totalItems += orderData.items?.length || 0;
            cashier.totalOrders += 1;
            
            if (cashier.totalOrders > 0) {
                cashier.averageOrderValue = cashier.totalRevenue / cashier.totalOrders;
            }
        }
        
        await this.save();
        return this;
        
    } catch (error) {
        console.error('Error updating report with order:', error);
        throw error;
    }
};

// Method to get formatted report data for frontend
salesReportSchema.methods.getFormattedReport = function() {
    return {
        year: this.year,
        monthlyBreakdown: this.monthlyBreakdown,
        weeklyBreakdown: this.weeklyBreakdown,
        salesData: this.products,
        summary: this.summary,
        performance: this.performance
    };
};

const SalesReport = mongoose.model('SalesReport', salesReportSchema);
export default SalesReport;