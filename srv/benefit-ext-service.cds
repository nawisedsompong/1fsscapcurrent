

using {benefit as db} from '../db/data-model';
using {sf as sf} from '../db/sf-model';
using {calculation as cal} from '../db/cal-model';
using EMPLOYEE_HR_CHECKER from '../db/cal-model';
@cds.query.limit.max: 10000
service CalculationService @(path:'/calclaim')@(impl:'./benefit-ext-service.js')
@(requires:['system-user','authenticated-user']) 
 {
   @readonly entity getEmployeeHrChecker(EMPLOYEE_ID:String(50),CLAIMCODE:String(13),HR_MAKER_LOGGED:String(13)) 
   as select from EMPLOYEE_HR_CHECKER(EMPLOYEE_ID: :EMPLOYEE_ID,CLAIMCODE: :CLAIMCODE,HR_MAKER_LOGGED: :HR_MAKER_LOGGED);
  
   @readonly entity getEmployeeDetails(USER_ID:String(50)) as select from cal.EMP_MASTER_DETAILS(USER_ID: :USER_ID);
   //@readonly entity getClaimBalanceDetails(USER_ID:String(50),CLAIM_CODE_IN:String(50),ELIGIBILITY:String(50)) as select from cal.GET_TAKEN_PENDING(USER_ID: :USER_ID,CLAIM_CODE_IN: :CLAIM_CODE_IN,ELIGIBILITY: :ELIGIBILITY);
    @readonly entity getClaimBalanceDetails(USER_ID:String(50),CLAIM_YEAR:String(13)) as select from cal.GET_TAKEN_PENDING(USER_ID: :USER_ID,CLAIM_YEAR: :CLAIM_YEAR);
    @readonly entity getClaimBalanceDetailsall(USER_ID:String(50) ,CLAIM_YEAR:String(13)) as select from cal.GET_TAKEN_PENDING_ALL(USER_ID: :USER_ID,CLAIM_YEAR: :CLAIM_YEAR);
    @cds.query.limit.max: 500000
	@cds.query.limit.default: 500000
    @readonly entity MEDISAVE_REPORT as select from cal.MEDISAVE_REPORT;
    function getSDFClaimBalanceDetails(USER_ID: String(50)) returns {
    	ENTITLEMENT: Decimal(10,2);
    	UNUTILIZED_AMOUNT: Decimal(10,2); 
    	PENDING_SDFR_AMOUNT: Decimal(10,2);
    	PENDING_SDFC_AMOUNT: Decimal(10,2);
    	TAKEN_AMOUNT: Decimal(10,2);
    	BALANCE: Decimal(10,2); 
    };
    // @readonly entity getClaimBalanceDetailsall(USER_ID:String(50) ,CLAIM_YEAR:String(13),PERSONAL_SUBAREA:String(20),PERSONAL_AREA_IN:String(20)) as select from cal.GET_TAKEN_PENDING_ALL(USER_ID: :USER_ID,CLAIM_YEAR: :CLAIM_YEAR,PERSONAL_SUBAREA: :PERSONAL_SUBAREA,PERSONAL_AREA_IN: :PERSONAL_AREA_IN);
   //function userValidation(USERID:String) returns String;
   @cds.query.limit.max: 500000
   @cds.query.limit.default: 500000
   entity Claim_Coordinator_ytd(claim_Cordinator : String(50)) as select from cal.Claim_Coordinator_ytd(claim_Cordinator: :claim_Cordinator);
   entity excelUpload   as projection on cal.excelUpload ;
   entity uploadConfig   as projection on cal.uploadConfig;
   entity pay_up_config   as projection on cal.pay_up_config;
   entity THREAD_JOB_INFO as projection on cal.THREAD_JOB_INFO;
   entity PAY_UP as projection on cal.PAY_UP;
   entity EXPORT_REPORT_STATUS as projection on cal.EXPORT_REPORT_STATUS;
   function exportExcelClaim(USERID:String,fromDate:Date,toDate:Date,CORDIN:String,Personnel_Area:String,Personal_Subarea:String,Pay_Grade:String,Division:String,HR_ADMIN:String,CLAIM_STATUS:String,CLAIM_TYPE:String,CATEGORY_CODE:String,CLAIM_REFERENCE :String) returns String;
   function exportExcelTemplate(CLAIM:String) returns String;
   function getUploadErrorLog(id:String) returns {id:String; error:String;success:String};
   function getPay_Up_LineItems(id:String, paymentTo:String(7)) returns array of {
   	   ID : String(256);
       CLAIM_CODE:String(50);
       CLAIM_CODE_DESCRIPTION:String(150);
       SCHOLAR_ID:String(50);
       SCHOLAR_NAME:String(256);
       ITEM_DESC :String(256);
	   INVOICE_NUMBER:String(50);
	   SCHOLAR_UNIV :String(150);
	   SCHOLAR_DISC :String(150);
	   SCHOLAR_SCHEME :String(150);
	   VENDOR_CODE:String(50);
	   GL_ACCOUNT:String(50);
	   INVOICE_DATE: Date; 
	   CURRENCY: String(10); 
	   CLAIM_AMOUNT: Decimal(10,2); 
	   ITEM_LINE_REMARKS_EMPLOYEE: String(500);
	   CUST_BANKNAME: String;
	   CUST_CURRENCY: String;
	   CUST_ACCOUNTOWNER: String;
	   CUST_BANKACCOUNTNUMBER: String;
	   CUST_VENDORCODE: String;
   };
   
   type ScholarIdType: {
	SCHOLAR_ID: String(50);
   }
   action getScholarsBankDetails(SCHOLAR_IDs: array of {SCHOLAR_ID: String(50);}) returns array of {
   	EXTERNALCODE: String;
	CUST_BANKNAME: String;
	CUST_CURRENCY: String;
	CUST_ACCOUNTOWNER: String;
	CUST_BANKACCOUNTNUMBER: String;
	CUST_PRIMARYBANKACCOUNTSTR: String;
	CUST_VENDORCODE: String;
	OVRSEAS_CUST_BANKACCOUNT_EXTERNALCODE: String;
	OVRSEAS_CUST_ACCOUNTOWNER: String;
	OVRSEAS_CUST_BANKACCOUNTNUMBER: String;
	OVRSEAS_CUST_CURRENCY: String(50);
	OVRSEAS_CUST_BANK: String;
	OVRSEAS_CUST_PRIMARYBANKSTR: String;
   };
   
 }