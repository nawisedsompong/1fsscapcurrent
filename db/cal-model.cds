using {
    cuid,
    managed
} from '@sap/cds/common';

using {sf as sf} from '../db/sf-model';
using {benefit as be} from '../db/data-model';

// @cds.persistence.calcview
// @cds.persistence.exists 
// Entity ![EMPLOYEE_HR_CHECKER] {
// SPECIALISATION: String(100); 
// USERID_HR_MAKER: String(50); 
// CLAIM_CLAIM_CODE: String(50); 
// CLAIM_SEQUENCE_OF_CHECK: String(10); 
// }
context calculation{
  
@cds.persistence.calcview
@cds.persistence.exists 
entity EMP_MASTER_DETAILS (USER_ID:String(50)){
key     SEQNUMBER: String(100) ; 
key     STARTDATE: String ; 
key     USERID: String(100); 
		CUSTOMSTRING3: String(100); 
    	CUSTOMSTRING4: String(100)  ; 
    	PAYGRADE: String(100)  ; 
    	EMPLOYEECLASS: String(100) ; 
    	COMPANY: String(100) ; 
    	LOCATION: String(100) ; 
		MANAGERID: String(100)  ; 
		DEPARTMENT: String(100) ; 
		DIVISION: String(100); 
		EMPLOYEETYPE: String(100); 
		STANDARDHOURS: Decimal(10, 2); 
		PERSONIDEXTERNAL: String(100); 
		STARTDATE_1: String; 
		FIRSTNAME: String(100); 
		LASTNAME: String(100); 
		EMAILADDRESS: String(100); 
		ADMIN: String(50); 
		MANAGER: String(50);
		ADMIN_ROLE : String(10);
		BEN_INFO : String(10);
		BEN_COPAY : String(10);
		BEN_ELIGIBILITY : String(10);
		BEN_APPROVAL : String(10);
		BEN_HR_MAKER : String(10);
		BEN_HR_CHECKER : String(10);
		BEN_TABLE_MAINT : String(10);
		BEN_MASS_CREATE : String(10);
		BEN_MASS_CONFIG : String(10);
		BEN_ON_BEHALF : String(10);
		BEN_COORDIN : String(10);
		BEN_REPORT : String(10);
		BEN_MED_SAVE : String(10);
		DIVISION_DESC:String(150);
		DEPARTMENT_DESC:String(150);
}

@cds.persistence.calcview
@cds.persistence.exists 
// entity GET_TAKEN_PENDING (USER_ID:String(50),CLAIM_CODE_IN:String(50),ELIGIBILITY:String(50)){
entity GET_TAKEN_PENDING (USER_ID:String(50),CLAIM_YEAR:String(13)){
key     EMPLOYEE: String(50); 
key     CLAIM_CODE_VALUE: String(50); 
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
}


@cds.persistence.calcview
@cds.persistence.exists 
// entity GET_TAKEN_PENDING (USER_ID:String(50),CLAIM_CODE_IN:String(50),ELIGIBILITY:String(50)){
entity GET_TAKEN_PENDING_ALL (USER_ID:String(50), CLAIM_YEAR:String(13)){
key     EMPLOYEE: String(50); 
key     CLAIM_CODE_VALUE: String(50); 
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
}

entity excelUpload {

   key id:Integer;
   @Core.MediaType: mediaType
   content : LargeBinary ;
   @Core.IsMediaType: true
   mediaType : String;
   fileName : String;
   
}

entity uploadConfig {

   key id:Integer;
   @Core.MediaType: mediaType
   content : LargeBinary ;
   @Core.IsMediaType: true
   mediaType : String;
   fileName : String;
   
}

entity pay_up_config {

   key id:Integer;
   @Core.MediaType: mediaType
   content : LargeBinary ;
   @Core.IsMediaType: true
   mediaType : String;
   fileName : String;
   
}

entity PRORATED_CLAIMS_YTD {
	key	EMPLOYEE: String(50); 
    key	CLAIM_CODE_VALUE: String(50); 
	key	YEAR : String(13);
		DESCRIPTION: String(50); 
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
}

entity PRORATED_CLAIMS_YTD2 as
   	select from PRORATED_CLAIMS_YTD as prrCytd
   	left join sf.PerPersonal as prsnl 
   	on ( prrCytd.EMPLOYEE = prsnl.personIdExternal )
   	left join be.Benefit_Entitlement_Adjust as beEntAdj
   	on ( prrCytd.EMPLOYEE = beEntAdj.emp_Id AND
   		 prrCytd.YEAR = beEntAdj.Year AND
   		 prrCytd.CLAIM_CODE_VALUE = beEntAdj.Claim_code
   	   )
   	left join be.Claim_Department as beClmDep
   	on ( prrCytd.DEPARMENT = beClmDep.Department_Code AND prrCytd.PERSONAL_AREA = beClmDep.Company )
   	left join be.Claim_Division as beClmDiv
   	on ( prrCytd.DIVISION = beClmDiv.Division_Code AND prrCytd.PERSONAL_AREA = beClmDiv.Company )
   	{
		prrCytd.EMPLOYEE,
		prsnl.customString2 as NAME:String,
		prrCytd.CLAIM_CODE_VALUE,
		prrCytd.YEAR,
		prrCytd.DESCRIPTION,
		prrCytd.YTD_OTHER,
		prrCytd.YTD_CONSULT,
		prrCytd.YTD_WARD_CHARGE,
		prrCytd.YTD_HOSPITAL_FEE,
		prrCytd.PENDING_AMOUNT,
		prrCytd.TAKEN_AMOUNT,
		prrCytd.BALANCE,
		prrCytd.ENTITLEMENT,
    	CASE WHEN prrCytd.CLAIM_CODE_VALUE like '%_DAY' THEN 'Days'
			 ELSE 'SGD' END as UNIT:String,
		beEntAdj.Adjustment,
		prsnl.startDate,
		prsnl.endDate,
		'' as BE_REF_DATE:String,
		prrCytd.PAY_GRADE,
		prrCytd.PERSONAL_AREA,
		prrCytd.PERSONAL_SUB_AREA,
		prrCytd.DEPARMENT,
		beClmDep.Department_Desc,
		prrCytd.DIVISION,
		beClmDiv.Division_Desc
   	};
   	
entity THREAD_JOB_INFO {

   key id:Integer;
   key process :String;
   key YEAR:String(13);
   key PAY_GRADE: String(100); 
   key PERSONAL_AREA: String(100); 
   key PERSONAL_SUB_AREA: String(100); 
   key DIVISION: String(100);
   job_end_time: DateTime;
   job_status:String(1);
}

entity upload_errlog {
   key id:String;
   error: String(1000);
   success: String;
}

entity YTD_EMPLOYEE_CLAIM_STATUS {
   key EMPLOYEE_ID:String;
   key YEAR: String(10);
   STATUS: String;
}

entity PAY_UP {
   key ID : String(256);
	   UPLOAD_REFERENCE_ID: String(50);
   key CLAIM_CODE:String(50);
   key SCHOLAR_ID:String(50);
       ITEM_DESC :String(256);
   key INVOICE_NUMBER:String(50);
	   //SCHOLAR_UNIV :String(150);
	   //SCHOLAR_DISC :String(150);
	   //SCHOLAR_SCHEME :String(150);
	   VENDOR_CODE:String(50);
	   INVOICE_DATE: Date; 
	   CURRENCY: String(10); 
	   CLAIM_AMOUNT: Decimal(10,2); 
	   ITEM_LINE_REMARKS_EMPLOYEE: String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
}

}

@cds.persistence.calcview
@cds.persistence.exists
entity EMPLOYEE_HR_CHECKER (EMPLOYEE_ID:String(50),CLAIMCODE:String(13),HR_MAKER_LOGGED:String(13)) {
  key CLAIM_CLAIM_CODE : String(50);
  key CLAIM_SEQUENCE_OF_CHECK : String(10);
	USERID_HR_MAKER: String(50); 
	SPECIALISATION: String(100); 
  }