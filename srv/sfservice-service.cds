using {sf as sf} from '../db/sf-model';
using {calculation as cal} from '../db/cal-model';
@cds.query.limit.max: 15000
service sfservice @(path:'/sfservice')@(impl:'./sfservice-service.js')
@(requires:['system-user','authenticated-user'])
{
	entity claimPostingCutoff as projection on sf.claimPostingCutoff
	 entity PerEmail as projection on sf.PerEmail;
	 entity EmpEmployment as projection on sf.EmpEmployment;
	 entity EmpWorkPermit as projection on sf.EmpWorkPermit;
	 entity EmpJob as projection on sf.EmpJob;
	 entity EmpJobRelationships as projection on sf.EmpJobRelationships;
	 entity PerPersonal as projection on sf.PerPersonal;
	 entity EmpPayCompNonRecurring as projection on sf.EmpPayCompNonRecurring;
	 entity EmployeeTime as projection on sf.EmployeeTime
	 entity FOLocation as projection on sf.FOLocation
	 entity HolidayAssignment as projection on sf.HolidayAssignment
	 entity EmpPayCompRecurring as projection on sf.EmpPayCompRecurring
	 entity PerPersonRelationship as projection on sf.PerPersonRelationship;
	 entity YTD_EMPLOYEE_CLAIM_STATUS as projection on cal.YTD_EMPLOYEE_CLAIM_STATUS;
	 @readonly entity EmpJobPayCompRecurring as projection on sf.EmpJobPayCompRecurring;
	 
	function SFReplicationClaim(StartDate:String,EndDate:String) returns array of {
		EMPLOYEE_ID: String(100);
		CLAIM_REF_NUMBER: String(100);
		EFFECTIVE_DATE: Date;
		PAY_COMPONENT: String(50);
		CLAIM_AMOUNT: Decimal(10,2);
		SEQUENCE: Integer;
	};
	function SAPReplicationClaim(StartDate:String,EndDate:String) returns array of {
		EMPLOYEE_ID: String(100);
		CLAIM_REF_NUMBER: String(100);
		EFFECTIVE_DATE: Date;
		PAY_COMPONENT: String(50);
		UNIT: Decimal(10,2);
	};
	function SFReplicationMedicalClaim(StartDate:String,EndDate:String) returns array of {
		EMPLOYEE_ID: String(100);
		CLAIM_REF_NUMBER: String(100);
		EFFECTIVE_DATE: Date;
		PAY_COMPONENT: String(50);
		CLAIM_AMOUNT: Decimal(10,2);
		SEQUENCE: Integer;
	};
	function SFReplicationSMSClaim(StartDate:String,EndDate:String,SGDCurrency:String(5)) returns array of {
		EXPORT_REFERENCE: String(50);
		COMPANY_CODE: String(10);
		RECEIPT_DATE: String(10);
		FILE_GEN_DATE: String(10);
		DOC_TYPE: String(10);
		CURRENCY: String(20);
		INVOICE_NUMBER: String(100);
		HEADER_TEXT: String(50);
		POSTING_KEY: String(10);
		VENDOR_GL_CODE: String(100);
		COST_CENTER: String(10);
		AMOUNT: Decimal(10,2);
		TAX_INDICATOR: String(10);
		TAX_CODE: String(10);
		REMARKS: String;
	};
	entity Replication_Logs as projection on sf.Replication_Logs;
	entity SMS_Replication_Logs as projection on sf.SMS_Replication_Logs;
	entity SMS_Excel_Upload as projection on sf.SMS_Excel_Upload;
	entity SMS_Excel_Upload_Logs as projection on sf.SMS_Excel_Upload_Logs;
	entity PER_NATIONALID as projection on sf.PER_NATIONALID;
	function exportChargeOutExcelReport(Cluster: String, Scholarship_Scheme: String, Year_Of_Award: String(4), Scholar_Status: String, From_Date: Date, To_Date: Date) returns String;
	
	function SFEMPJobCPIDelete(userid:String) returns String;
	
	type division_type : {
        COMPANY: String(50);
        DIVISION_CODE: String(150);
        DIVISION_DESC: String(150);
    };
    
    type department_type : {
        COMPANY: String(50);
        DEPARTMENT_CODE: String(150);
        DEPARTMENT_DESC: String(150);
    };
    
    type personal_area_type : {
        COMPANY: String(50);
        PERSONAL_AREA: String(150);
        PERSONAL_DESC: String(150);
    };
    
    type personal_sub_area_type : {
        COMPANY: String(50);
        PERSONAL_SUB_AREA: String(150);
        PERSONAL_SUB_DESC: String(150);
    };
    
    type specialisation_type : {
        COMPANY: String(50);
        SPECIAL_CODE: String(150);
        SPECIAL_DESC: String(150);
    };
    
    type sponsor_type : {
        COMPANY: String(50);
        SPONSOR_CODE: String(150);
        SPONSOR_DESC: String(150);
    };
    
    type paygrade_type : {
        COMPANY: String(50);
        PAYGRADE_ID: String(150);
        PAYGRADE_DESC: String(150);
    };
	action masterDataSync(DIVISION: array of division_type, DEPARTMENT: array of department_type, PA: array of personal_area_type, PSA: array of personal_sub_area_type, SPECIALISATION: array of specialisation_type, SPONSOR: array of sponsor_type, PAY_GRADE: array of paygrade_type) returns { message: String };
}