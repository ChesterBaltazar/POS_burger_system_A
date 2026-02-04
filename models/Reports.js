import mongoose from 'mongoose';


const salesReportSchema = new mongoose.Schema({
    reportName: String,
    period: String,
    
    
    products: [{
        productName: String,
        unitsSold: Number,
        revenue: Number
    }],
    
    
    performance: {
        summary: {  
            type: String,
            enum: ['Excellent', 'Good', 'Average', 'Poor'],
            default: 'Average'
        },
        
        // Auto-calculated metrics
        calculated: {
            totalRevenue: Number,
            totalUnits: Number,
            avgRevenuePerUnit: Number,
            bestSeller: String,
            worstSeller: String
        },
        
        
        comparison: {
            previousPeriodGrowth: Number,  
            vsTarget: Number               
        }
    }
}, {
    timestamps: true
});

salesReportSchema.pre('save', function(next
) {
    
    this.performance.calculated = {
        totalRevenue: this.products.reduce((sum, p) => sum + p.revenue, 0),
        totalUnits: this.products.reduce((sum, p) => sum + p.unitsSold, 0)
    };
    
    
    if (this.performance.calculated.totalUnits > 0) {
        this.performance.calculated.avgRevenuePerUnit = 
            this.performance.calculated.totalRevenue / this.performance.calculated.totalUnits;
    }
    
    
    if (this.products.length > 0) {
        const sorted = [...this.products].sort((a, b) => b.unitsSold - a.unitsSold);
        this.performance.calculated.bestSeller = sorted[0].productName;
        this.performance.calculated.worstSeller = sorted[sorted.length - 1].productName;
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
    
    next(); 
});

export const salesReport = mongoose.model('salesReport', salesReportSchema);
export default salesReport;