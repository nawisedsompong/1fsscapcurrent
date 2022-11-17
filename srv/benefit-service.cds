using {benefit as db} from '../db/data-model';
using {sf as sf} from '../db/sf-model';
using {calculation as cal} from '../db/cal-model';
@cds.query.limit.max: 100000
service ClaimService @(path:'/claim')@(impl:'./benefit-service.js')
@(requires:['system-user','authenticated-user']) 
 {
   entity approval as projection on db.approval;
   entity approval_structure  @(restrict : [
            {
                grant : [ 'READ' ],
                to :'authenticated-user'
                // to :  'employeeval' 
                 //where: '$user.Region = Asia'
            },
            {
                grant : [ 'CREATE','UPDATE','DELETE' ],
                to :  'zadmin' 
            }
        ]) as projection on db.approval_structure;
    entity approval_structure_hr @(restrict : [
            {
                grant : [ 'READ' ],
                to :'authenticated-user'
                // to :  'employeeval' 
                 //where: '$user.Region = Asia'
            },
            {
                grant : [ 'CREATE','UPDATE','DELETE' ],
                to :  'zadmin' 
            }
        ]) as projection on db.approval_structure_hr;
   entity Benefit_Claim_Admin  @(restrict : [
            {
                grant : [ 'READ' ],
                to :'authenticated-user'
                // to :  'employeeval' 
                 //where: '$user.Region = Asia'
            },
            {
                grant : [ 'CREATE','UPDATE','DELETE' ],
                to :  'zadmin' 
            }
        ])  as projection on db.Benefit_Claim_Admin;
   entity Claim_Admin  @(restrict : [
            {
                grant : [ 'READ' ],
                to :'authenticated-user'
                // to :  'employeeval' 
                 //where: '$user.Region = Asia'
            },
            {
                grant : [ 'CREATE','UPDATE','DELETE' ],
                to :  'zadmin' 
            }
        ])  as projection on db.Claim_Admin;
   entity Claim_Category @(restrict : [
            {
                grant : [ 'READ' ],
                to :'authenticated-user'
                // to :  'employeeval' 
                 //where: '$user.Region = Asia'
            },
            {
                grant : [ 'CREATE','UPDATE','DELETE' ],
                to :  'zadmin' 
            }
        ])  as projection on db.Claim_Category;
   entity Claim_Clinic  @(restrict : [
            {
                grant : [ 'READ' ],
                to :'authenticated-user'
                // to :  'employeeval' 
                 //where: '$user.Region = Asia'
            },
            {
                grant : [ 'CREATE','UPDATE','DELETE' ],
                to :  'zadmin' 
            }
        ])  as projection on db.Claim_Clinic;
   entity Claim_Code  @(restrict : [
            {
                grant : [ 'READ' ],
                to :'authenticated-user'
                // to :  'employeeval' 
                 //where: '$user.Region = Asia'
            },
            {
                grant : [ 'CREATE','UPDATE','DELETE' ],
                to :  'zadmin' 
            }
        ])  as projection on db.Claim_Code;
   entity Claim_Department  @(restrict : [
            {
                grant : [ 'READ' ],
                to :'authenticated-user'
                // to :  'employeeval' 
                 //where: '$user.Region = Asia'
            },
            {
                grant : [ 'CREATE','UPDATE','DELETE' ],
                to :  'zadmin' 
            }
        ])  as projection on db.Claim_Department;
   entity Claim_Division  @(restrict : [
            {
                grant : [ 'READ' ],
                to :'authenticated-user'
                // to :  'employeeval' 
                 //where: '$user.Region = Asia'
            },
            {
                grant : [ 'CREATE','UPDATE','DELETE' ],
                to :  'zadmin' 
            }
        ])  as projection on db.Claim_Division;
   entity Claim_Pa as projection on db.Claim_Pa;
   entity Claim_Paycomponent as projection on db.Claim_Paycomponent;
   entity Claim_Pay_Grade as projection on db.Claim_Pay_Grade;
   entity Claim_PSA as projection on db.Claim_PSA;
   entity Claim_Specialisation  @(restrict : [
            {
                grant : [ 'READ' ],
                to :'authenticated-user'
                // to :  'employeeval' 
                 //where: '$user.Region = Asia'
            },
            {
                grant : [ 'CREATE','UPDATE','DELETE' ],
                to :  'zadmin' 
            }
        ])  as projection on db.Claim_Specialisation;
   entity Claim_Sponsor  @(restrict : [
            {
                grant : [ 'READ' ],
                to :'authenticated-user'
                // to :  'employeeval' 
                 //where: '$user.Region = Asia'
            },
            {
                grant : [ 'CREATE','UPDATE','DELETE' ],
                to :  'zadmin' 
            }
        ])  as projection on db.Claim_Sponsor;
   entity Claim_Status as projection on db.Claim_Status;
   entity Company_Claim_Category as projection on db.Company_Claim_Category;
   entity Company_Master as projection on db.Company_Master;
   entity Demo_Hana as projection on db.Demo_Hana;
   entity overtime_claim as projection on db.overtime_claim;
   entity Benefit_Eligibility @(restrict : [
            {
                grant : [ 'READ' ],
                to :'authenticated-user'
                // to :  'employeeval' 
                 //where: '$user.Region = Asia'
            },
            {
                grant : [ 'CREATE','UPDATE','DELETE' ],
                to :  'zadmin' 
            }
        ])  as projection on db.Benefit_Eligibility;
   entity Co_Payment  @(restrict : [
            {
                grant : [ 'READ' ],
                to :'authenticated-user'
                // to :  'employeeval' 
                 //where: '$user.Region = Asia'
            },
            {
                grant : [ 'CREATE','UPDATE','DELETE' ],
                to :  'zadmin' 
            }
        ])  as projection on db.Co_Payment;
   entity EMPLOYEE_MASTER as projection on db.EMPLOYEE_MASTER;
   entity Medical_Claim as projection on db.Medical_Claim;
   entity CPR_CLAIM as projection on db.CPR_CLAIM;
   entity WRC_HR_LINEITEM_CLAIM as projection on db.WRC_HR_LINEITEM_CLAIM;
   entity WRC_HR_MASTER_CLAIM as projection on db.WRC_HR_MASTER_CLAIM;
   entity WRC_LINEITEM_CLAIM as projection on db.WRC_LINEITEM_CLAIM;
   entity WRC_MASTER_CLAIM as projection on db.WRC_MASTER_CLAIM;
   entity WRC_CLAIM_TYPE  @(restrict : [
            {
                grant : [ 'READ' ],
                to :'authenticated-user'
                // to :  'employeeval' 
                 //where: '$user.Region = Asia'
            },
            {
                grant : [ 'CREATE','UPDATE','DELETE' ],
                to :  'zadmin' 
            }
        ])  as projection on db.WRC_CLAIM_TYPE;
   entity Location_RO  @(restrict : [
            {
                grant : [ 'READ' ],
                to :'authenticated-user'
                // to :  'employeeval' 
                 //where: '$user.Region = Asia'
            },
            {
                grant : [ 'CREATE','UPDATE','DELETE' ],
                to :  'zadmin' 
            }
        ])  as projection on db.Location_RO;
   entity masterandLocation as projection on db.masterandLocation;
   //entity LocationEmployeeDetails as projection on db.LocationEmployeeDetails;
   //entity claimApproverView (input1 :String) as select from db.claimApproverView(input1: :input1);
   entity TC_MASTER_CLAIM as projection on db.TC_MASTER_CLAIM;
   entity TC_LINEITEM_CLAIM as projection on db.TC_LINEITEM_CLAIM;
   entity COV_MASTER_CLAIM as projection on db.COV_MASTER_CLAIM;
   entity COV_LINEITEM_CLAIM as projection on db.COV_LINEITEM_CLAIM;
   entity PC_CLAIM as projection on db.PC_CLAIM;
   entity PTF_ACL_BCL_CLAIM as projection on db.PTF_ACL_BCL_CLAIM;
   entity SP_MASTER_CLAIM as projection on db.SP_MASTER_CLAIM;
   entity SP_LINEITEM_CLAIM as projection on db.SP_LINEITEM_CLAIM;
   entity SP1_MASTER_CLAIM as projection on db.SP1_MASTER_CLAIM;
   entity SP1_LINEITEM_CLAIM as projection on db.SP1_LINEITEM_CLAIM;
   entity SP2_MASTER_CLAIM as projection on db.SP2_MASTER_CLAIM;
   entity SP2_LINEITEM_CLAIM as projection on db.SP2_LINEITEM_CLAIM;
   entity SP3_MASTER_CLAIM as projection on db.SP3_MASTER_CLAIM;
   entity SP3_LINEITEM_CLAIM as projection on db.SP3_LINEITEM_CLAIM;
   entity SDFC_MASTER_CLAIM as projection on db.SDFC_MASTER_CLAIM;
   entity SDFC_LINEITEM_CLAIM as projection on db.SDFC_LINEITEM_CLAIM;
   entity SDFR_MASTER_CLAIM as projection on db.SDFR_MASTER_CLAIM;
   entity SDFR_LINEITEM_CLAIM as projection on db.SDFR_LINEITEM_CLAIM;
   entity CPC_MASTER_CLAIM as projection on db.CPC_MASTER_CLAIM;
   entity CPC_LINEITEM_CLAIM as projection on db.CPC_LINEITEM_CLAIM;
   entity OC_MASTER_CLAIM as projection on db.OC_MASTER_CLAIM;
   entity OC_LINEITEM_CLAIM as projection on db.OC_LINEITEM_CLAIM;
   entity PAY_UP_MASTER_CLAIM as projection on db.PAY_UP_MASTER_CLAIM;
   entity PAY_UP_LINEITEM_CLAIM as projection on db.PAY_UP_LINEITEM_CLAIM;
   entity AHP_LIC_MS_WIC_CLAIM as projection on db.AHP_LIC_MS_WIC_CLAIM;
   //entity Benefit_Entitlement_Adjust  @(restrict : [
   //         {
   //             grant : [ 'READ' ],
   //             to :'authenticated-user'
   //             // to :  'employeeval' 
   //              //where: '$user.Region = Asia'
   //         },
   //         {
   //             grant : [ 'CREATE','UPDATE','DELETE' ],
   //             to :  'zadmin' 
   //         }
   //     ]) 
   entity Benefit_Entitlement_Adjust as projection on db.Benefit_Entitlement_Adjust;
   entity cprandclaim as projection on db.cprandclaim;
   entity sdfandClaim as projection on db.sdfandClaim;
   entity Medisave_Credit @(restrict : [
            {
                grant : [ 'READ' ],
                to :'authenticated-user'
                // to :  'employeeval' 
                 //where: '$user.Region = Asia'
            },
            {
                grant : [ 'CREATE','UPDATE','DELETE' ],
                to :  'zadmin' 
            }
        ])   as projection on db.Medisave_Credit;
   entity CLAIM_CANCEL_MASTER as projection on db.CLAIM_CANCEL_MASTER;
   entity Benefit_Transport_Amount as projection on db.Benefit_Transport_Amount;
   entity VEHICLE_RATE  @(restrict : [
            {
                grant : [ 'READ' ],
                to :'authenticated-user'
                // to :  'employeeval' 
                 //where: '$user.Region = Asia'
            },
            {
                grant : [ 'CREATE','UPDATE','DELETE' ],
                to :  'zadmin' 
            }
        ])  as projection on db.VEHICLE_RATE;
   entity BEN_LOCATION  @(restrict : [
            {
                grant : [ 'READ' ],
                to :'authenticated-user'
                // to :  'employeeval' 
                 //where: '$user.Region = Asia'
            },
            {
                grant : [ 'CREATE','UPDATE','DELETE' ],
                to :  'zadmin' 
            }
        ])  as projection on db.BEN_LOCATION;
   //entity postRingFencing as projection on db.Medisave_Credit; 
   entity SUPER_ADMIN as projection on db.SUPER_ADMIN;
   entity ADMIN_ROLE as projection on db.ADMIN_ROLE;
   entity ADMIN_TILE_LIST as projection on db.ADMIN_TILE_LIST;
   entity claimPostingCutoff @(restrict : [
            {
                grant : [ 'READ' ],
                to :'authenticated-user'
                // to :  'employeeval' 
                 //where: '$user.Region = Asia'
            },
            {
                grant : [ 'CREATE','UPDATE','DELETE' ],
                to :  'zadmin' 
            }
        ])  as projection on sf.claimPostingCutoff;
	entity DELEGATOR as projection on db.DELEGATOR;
	entity DELEGATOR_SELF as select from db.DELEGATOR_SELF;
	entity DELEGATOR_CREATED as select from db.DELEGATOR_CREATED;
	entity ESTIMATION_PAYMENT as projection on db.ESTIMATION_PAYMENT;
	entity CLAIM_COORDINATOR as projection on db.CLAIM_COORDINATOR;
	entity OVERSEAS_BANK as projection on sf.OVERSEAS_BANK;
	entity SCHOLAR_SCHEME as projection on sf.SCHOLAR_SCHEME;
	entity BANK_ACC as projection on sf.BANK_ACC;
	entity INFLIGHT_SCHOLAR as projection on sf.INFLIGHT_SCHOLAR;
	entity CURRENCY as projection on db.CURRENCY;
	entity GL_MAPPING as projection on db.GL_MAPPING;
	entity VENDOR as projection on db.VENDOR;
	entity GL_details as projection on db.GL_details;
	entity PostingEstDate as projection on sf.PostingEstDate;
	
	function userValidationTest(USERID:String) returns String;
	function userValidation() returns String;
	function EmployeeDetailsFetch(USERID:String) returns String;
	function DropDowns() returns String;
	
	type benefitClaimType : {
        	// Start_Date:Date;
    		Date:Date;
    		Company:String(50);
    		Claim_Code:String(50);
    		Claim_Category:String(50);
    };
	
	action ProrationRule(UserID:String,Entitlement:Decimal,EmpType:String,WorkingPeriod:String,ClaimDetail: benefitClaimType) returns String;
	action ProrationRule1(UserID:String,Entitlement:Decimal,EmpType:String,WorkingPeriod:String,ClaimDetail: benefitClaimType) returns String;
	
	function BenefitTransportReceiptAmount(DivisionFrom:String,DivisionTo:String,VehicleCode:String,ERP:Decimal(5,2),ParkingCost:Decimal(5,2)) returns Decimal (9,4);
	
	action deleteGeneral(deleteItems :String,table_Name:String) returns String;
	action submitForApproval(listofClaims: String,table_Name:String) returns String;
	action cancelApproval(listofClaims: String,table_Name:String) returns String;	
	action claimApprovalOrReject(listofClaims: String,ARF:String ,APP_COMMENT:String) returns String;
	action claimApprovalOrRejectItems(listofClaims: String,ARF:String ,APP_COMMENT:String,table_Name:String) returns String;
	action delegateApprover(listofClaims: String ,APP_COMMENT:String ,DELEGATE_APPROVER:String,VAR_ARF:String) returns String;
	action rerouteApprover(listofClaims: String ,APP_COMMENT:String ,REROUTE_APPROVER:String,VAR_ARF:String,REROUTE_BY:String) returns String;
	action submitMedicalClaim(input1: String) returns String;
	
	type recepient : {
        name: String(50);
        email: String(50);
    };
    
    action sendEmailNotification (CLAIM_REFERENCE: String(100), CATEGORY_CODE: String(50), CATEGORY_NAME: String(256), CLAIM_CODE: String(50), CLAIM_NAME: String(256), CLAIM_STATUS: String(50), CLAIM_DATE: Date, CLAIM_OWNER_ID: String(50), CLAIM_OWNER_NAME: String(256), TABLE_NAME: String(100), LINEITEM_TABLE_NAME: String(100)) returns { message: String(50) };
     // validate claim
    action validateClaim(copay: Medical_Claim) returns array of {message: String(100)};
    function employeeSelectApproverList(Owner: String(50),Claim_code:String(30), Receipt_Date:Date,behalf:String(10)) returns array of {
		    EMPLOYEE_ID : String(50);
		    FIRSTNAME :	String(100);
		    LASTNAME :String(100);
		    FULLNAME: String(100);
    };
    
  //validate co payment
type CoPayment : {
		Claim_Reference: String(100);
    	Claim_Code:String(150);
    	Description:String(150);
    	Clinic:String(50);
    	Clinic_Desc:String(150);
    	Med_Leave_Declar:String(50);
    	AL_Exceeded:String(5);
    	AL_Wardday_Limit:String(5);
    	Claim_Amount:Decimal(10,2);
    	Consultation_Fee:Decimal(10,2);
    	Other_Cost:Decimal(10,2);
    	Hospitalization_Fees:Decimal(10,2);
    	WARD_CHARGES:Decimal(10,2);
    	CAP_AMOUNT_PERCLAIM:Decimal(10,2);
    	CAP_AMOUNT_TOTAL:Decimal(10,2);
    	CAP_AMOUNT_ANNUAL:Decimal(10,2);
    	eligibility: Decimal(10,2);
    	taken: Decimal(10,2);
    	pending: Decimal(10,2);
    	YTDConsultation: Decimal(10,2);
    	YTDOthers: Decimal(10,2);
    	balance: Decimal(10,2);
    	claimDate: Date;
    	receptDate: Date;
    	company: String(50);
    	Claim_Category: String(50);
    	employee:String(50);
        CASH_AMOUNT: Decimal(10,2);
        MEDISAVE_AMOUNT: Decimal(10,2);
        MEDISHIELD_AMOUNT: Decimal(10,2);
        PRIVATE_INSURER_AMT: Decimal(10,2);
        RECEIPT_AMOUNT: Decimal(10,2);
        AMOUNT_PAID_VIA_PAYROLL: Decimal(10,2);
        AMOUNT_PAID_TOMEDISAVE: Decimal(10,2);
        AMOUNT_PAID_TOMDEISHIELD: Decimal(10,2);
        AMOUNT_PAID_TO_PRIVATE_INSURER: Decimal(10,2);
        consumedWardDays: Decimal(10,2);
        wardCharges: Decimal(10,2);
		claimConsultation: Decimal(10,2);
		claimOtherCost: Decimal(10,2);
		Hospitalization_Fees_Display: Decimal(10,2);
    };
    
    action validateMedicalClaim(claim: CoPayment) returns CoPayment;
    
     type medicalClaim: {
        employeeId: String(100);
    	Claim_Code:String(100);
        entitlement: Decimal(10,2);
        taken: Decimal(10,2);
    	pending: Decimal(10,2);
    	YTDConsultation: Decimal(10,2);
    	YTDOthers: Decimal(10,2);
    	YTDWardCharges: Decimal(10,2);
    	balance: Decimal(10,2);
        claimDate: Date;
        totalWardDays: Decimal(10,2);
        consumedWardDays: Decimal(10,2);
        remainingWardDays: Decimal(10,2);
        pendingWardDays: Decimal(10,2);
        claimAmountWWPending: Decimal(10,2); 
        claimAmountWW: Decimal(10,2);
        company: String(100);
    };
    action claimDetails(claim: medicalClaim) returns medicalClaim;
    
     type MedisaveRing: {
         employeeId: String(100);
    	 Claim_Code:String(100); 
         entitlement: Decimal(10,2);
         refNum: String(25);
         Ring_Fenced_Claim_Amount : Decimal(10,2);
         taken: Decimal(10,2);
    	 pending: Decimal(10,2);
         balance: Decimal(10,2);
         prorationEntitlement: Decimal(10,2);
         type: String(1);
         message:String(100);
    };
    
     function calculateRingFencing(currentYear: String(4) ) returns array of MedisaveRing;
     action postRingFencing(ringData: array of Medisave_Credit ) returns  String;
    
    type wrcClaimDetails : {
		WRC_CLAIM_TYPE_ID: String(50); 
		CLAIM_CODE: String(150);
		PAY_GRADE: String(50);
		AMOUNT: Decimal(10,2);
		DAY_TYPE: String(50);
		DAY_TYPE_CODE: String(50);
	};
	action getWrcClaimAmount(employeeId: String(100), claimCode: String(50), claimDate: Date, claimUnit: Integer) returns { claimDetails: wrcClaimDetails };
	action getMultipleWrcClaimAmount(lineItems: array of { employeeId: String(100); claimCode: String(50); claimDate: Date; claimUnit: Integer; }) returns { data: String; error: String };
	action validateWRCClaimLineItem(employeeId: String(100), department: String(150), division: String(50), locationRO: String(100), lineItems: array of { claimDate: DateTime; }) returns { message: String };
	function getLocationROs(employeeId: String(100), submissionDate: Date) returns array of {
		LOCATION_RO_EMPLOYEEID: String(100);
		FIRSTNAME: String(100);
		LASTNAME: String(100);
		FULLNAME :String(100);
		DEPARTMENT: String(150);
		DIVISION: String(50);
	};
	action validateDuplicateWRCClaim(employeeId: String(100), claimCode: String(50), claimReference: String(50), claimDate: Date, claimCategory: String(50)) returns { message: String };
	type wrcClaimLineItems : {
		employeeId: String(100);
		claimCode: String(50);
		claimReference: String(50);
		claimDate: Date;
		claimCategory: String(50);	
	};
	action validateMultipleDuplicateWRCClaim(claims: array of wrcClaimLineItems) returns { message: String };
	action validateClaimSubmission(employeeId: String(100), claimCode: String(50), claimReference: String(50), masterClaimReference: String(50), claimDate: Date, receiptDate: Date, receiptNumber: String(50), invoiceDate: Date, invoiceNumber: String(50),isHr :String(1),isMode: String(1), isApprover: String(1)) returns { message: String };
	type claimSubmissionLineItems: {
		employeeId: String(100);
		claimCode: String(50);
		claimReference: String(50);
		masterClaimReference: String(50);
		claimDate: Date;
		receiptDate: Date;
		receiptNumber: String(50);
		invoiceDate: Date;
		invoiceNumber: String(50);
		isHr :String(1);
		isMode: String(1);
		isApprover: String(1); 
	};
	action validateMultipleClaimSubmission(claims: array of claimSubmissionLineItems) returns { message: String };
	action validatePublicHolidayClaim(claimCode: String(50), claimDate: DateTime) returns { message: String };
	action calculateCoPayment(claimCode: String(50), claimAmount: Decimal(10,2),balance:Decimal(10,2)) returns { claimAmount: Decimal(10,2); masterClaimAmount: Decimal(10,2) };
	entity EmployeeEligibility(UserID:String(100)) as select from sf.EmployeeEligibility(EmpID: :UserID){*};
	entity EmployeeEligibilityall as select from sf.EmployeeEligibilityall{*};
	@cds.query.limit.default: 100000
	entity EmpJobView(YearValue:String(10)) as select from sf.EmpJobView(YearValue: :YearValue);
	@cds.query.limit.max: 500000
	@cds.query.limit.default: 500000
	entity PRORATED_CLAIMS_YTD as select from cal.PRORATED_CLAIMS_YTD2{*};
	entity INFT_SCHOLAR_SCHEME as select from sf.INFT_SCHOLAR_SCHEME;
	action calulationTransportClaim(lineitem :TC_LINEITEM_CLAIM) returns TC_LINEITEM_CLAIM;
	action copyLineItems(masterClaim :String , cancelClaim :array of CLAIM_CANCEL_MASTER ,table_Name:String) returns String;
	@readonly entity Approval_Histroy as select from db.Approval_Histroy;
	@readonly entity claim_coord_employee(claim_Cordinator:String(20)) as select from db.claim_coord_employee(claim_Cordinator: :claim_Cordinator);
	@readonly entity Approval_Claim_Coordinator(claim_Cordinator:String(20)) as select from db.Approval_Claim_Coordinator(claim_Cordinator: :claim_Cordinator);
	@readonly entity Approval_Claim_Coordinator_Line(claim_Cordinator:String(20)) as select from db.Approval_Claim_Coordinator_Line(claim_Cordinator: :claim_Cordinator);
	// @readonly entity cancelAfterApproveView as select from db.cancelAfterApproveView;
	@readonly entity app_histwithCancel as select from db.app_histwithCancel;
	@readonly entity app_histwithlineItem (EMP_LINEITEM:String(20)) as select from db.app_histwithlineItem(EMP_LINEITEM: :EMP_LINEITEM);
	@readonly entity app_histWithCancel_SessionUser as select from db.app_histWithCancel_SessionUser;
	@readonly entity app_histwithlineItem_admin (EMP_LINEITEM:String(20)) as select from db.app_histwithlineItem_admin(EMP_LINEITEM: :EMP_LINEITEM);
	@readonly entity app_histwithlineItem_ClaimSearch (EMP_LINEITEM:String(20)) as select from db.app_histwithlineItem_ClaimSearch(EMP_LINEITEM: :EMP_LINEITEM);
	@readonly function validateClaimCancellation(CLAIM_REFERENCE: String(100), LINEITEM_CLAIM_REFERENCE: String(100)) returns { message: String(50) };
	@readonly entity app_delegation(delegator_id:String(20)) as select from db.app_delegation(delegator_id: :delegator_id);
	@readonly entity claimstatus_ext as select from db.claimstatus_ext;
	@readonly entity SMS_PAYMENT_REPORT as select from db.SMS_PAYMENT_REPORT;
	@readonly entity BANK_ACC_VIEW  as select from sf.BANK_ACC_VIEW;
	function ApprovalHistory(USERID:String,fromDate:Date,toDate:Date,CORDIN:String,Personnel_Area:String,Personal_Subarea:String,Pay_Grade:String,Division:String,HR_ADMIN:String,CLAIM_STATUS:String,CLAIM_TYPE:String,CATEGORY_CODE:String) returns array of {
	// function ApprovalHistory(EMPLOYEE_ID:String,CLAIM_OWNER_ID:String,CLAIM_STATUS:String) returns array of {
		 CLAIM_REF_NUMBER: String(100);
		 CLAIM_REFERENCE: String(150);
		 REP_STATUS:String(20);
    	 EMPLOYEE_ID: String (50);
    	 EMPLOYEE_NAME: String(100);
    	 CLAIM_TYPE: String(50);
    	 CLAIM_DATE: Date;
    	 AMOUNT:Decimal(10,2);
    	 CLAIM_STATUS:String(50);
    	 CATEGORY_CODE:String(50);
    	 CLAIM_OWNER_ID: String(50);
    	 CLAIM_CATEGORY:String(50);
    	 SUBMITTED_BY:String(50);
    	 ESTIMATEPAYMENTDATE: Date;
    	 RECEIPT_DATE :  Date;
    	 CLAIM_OWNER_FIRSTNAME:String(100);
		 CLAIM_OWNER_LASTNAME:String(100);
		 CLAIM_OWNER_FULLNAME:String(100);
		 CANCELAFTERAPPROVE:String(1);
		 RESPONSE_DATE:Date;
	};
	type medicalYTDreport: {
        employeeId: String(100);
    	Claim_Code:String(100);
        entitlement: Decimal(10,2);
        taken: Decimal(10,2);
    	pending: Decimal(10,2);
    	YTDConsultation: Decimal(10,2);
    	YTDOthers: Decimal(10,2);
    	YTDWardCharges: Decimal(10,2);
    	YTDHospitalFee: Decimal(10,2);
    	balance: Decimal(10,2);
        claimDate: Date;
        totalWardDays: Integer;
        consumedWardDays: Integer;
        remainingWardDays: Integer;
        pendingWardDays: Integer;
        claimAmountWWPending: Decimal(10,2); 
        claimAmountWW: Decimal(10,2);
        company: String(100);
    };
	function YTDReport(USERID:String,CURRENT_DATE:Date,COMPANY:String) returns array of medicalYTDreport;
	function YTDReportWithCPIAll(USER_ID:String, CLAIM_YEAR:String(13),PERSONAL_SUB_AREA:String(20),PERSONAL_AREA_IN:String(20),PAY_GRADE:String(20),DIVISION:String(20)) returns String;
	action YTDReportWithAll(USER_ID:array of {EMPLOYEE:String}, CLAIM_YEAR:String(13),PERSONAL_SUB_AREA:String(20),PERSONAL_AREA_IN:String(20),PAY_GRADE:String(20),DIVISION:String(20)) returns array of {
		EMPLOYEE: String(50); 
    	CLAIM_CODE_VALUE: String(50); 
		DESCRIPTION: String(50); 
		YEAR : String(13);
		YTD_OTHER: Decimal(10,2); 
    	YTD_CONSULT: Decimal(10,2); 
    	YTD_WARD_CHARGE: Decimal(10,2); 
    	YTD_HOSPITAL_FEE: Decimal(10,2); 
    	PENDING_AMOUNT: Decimal(10,2); 
    	TAKEN_AMOUNT: Decimal(10,2); 
    	BALANCE: Decimal(10,2); 
    	ENTITLEMENT: String(30); 
    	PAY_GRADE: String(100); 
		PERSONAL_AREA: String(100); 
		PERSONAL_SUB_AREA: String(100); 
		DEPARMENT: String(100); 
		DIVISION: String(100); 
	};
	function YTDReportSpawn(USER_ID:String, CLAIM_YEAR:String(13),PERSONAL_SUB_AREA:String(20),PERSONAL_AREA_IN:String(20),PAY_GRADE:String(20),DIVISION:String(20)) returns String;
	action admin_role_create(ADMIN_ROLE:array of ADMIN_ROLE) returns array of ADMIN_ROLE;
 }
