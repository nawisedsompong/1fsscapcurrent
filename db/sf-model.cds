using {
    cuid,
    managed
} from '@sap/cds/common';

using {benefit as db} from '../db/data-model';
using {calculation as cal} from '../db/cal-model';

context sf{
entity claimPostingCutoff{
key	company:  String(100);
	payrollArea: String(100);
key	payrollPeriod: Date;
	claimFinalApprovalDateFrom: Date;
	claimFinalApprovalDateTo: Date;
	estimatePaymentDate: Date;
	postingCutoffDate: Date;
	replicationRestart: String(100)
};

entity PostingEstDate {
	key Rep_Type: String(50);
	key Rep_Start_Date: DateTime;
	Key Rep_End_Date: DateTime;
		Pay_Date: Date;
};

entity PerEmail
{
	key personIdExternal:String(100);
		emailAddress:String(100);

};
entity EmpEmployment
{
	key	personIdExternal:String(100);
	key userId:String(100);
		startDate :DateTime;
		endDate:DateTime;
		benefitsEligibilityStartDate: DateTime;
}
entity EmpWorkPermit
{
	key userid:String(100);
	key documentType :String(100);
		issueDate:DateTime;
		expirationDate:DateTime;


}
entity EmpJob
{
	key seqNumber:String(100);
	key startDate :DateTime;
	key userId :String(100);	
		customString3: String(100); //Specialization
		customString4: String(100); //Sponsor
		payGrade:   String(100); 
		employeeClass:String(100); 
		company:String(100); //Personnel Area
		location:String(100); //Personnel Subarea
		managerid:String(100); 
		department:String(100); 
		division:String(100); 
		employeeType:String(100);
		standardHours:Decimal(10,2);
		endDate:DateTime;
};
entity EmpJobRelationships {
		key userid:String(100);
		key	startdate:DateTime;
		key	relationshiptype:String(100);
		relUserId:String(100);
};		

entity EmpPayCompRecurring{
		key	startdate:DateTime;
		key	userid:String(100);
			paycomponent:String(100);
			paycompvalue:Decimal(10,2);
};

entity PerPersonal{
	key	personIdExternal:String(100);
	key	startDate:DateTime;
		endDate:DateTime;
		customString2:String(256);//full name
		firstName:String(100);
		lastName:String(100);
};

entity EmpPayCompNonRecurring{
	key sequenceNumber:String(100);
	key	userId:String(100);
		payComponentCode:String(100);
		value:Decimal(10,2);
		payDate:DateTime;
		lastModified:DateTime;
};	

entity HolidayAssignment {
		key	HolidayCalendar_externalCode: String(50);
		key	date: DateTime;
			holiday: String(100);
			holidayClass: String(50);
			
	};

entity FOLocation{
	key externalCode:String(100);
	key startDate:DateTime;
	    endDate:DateTime;
		standardHours:Decimal(10,2);
}

entity EmployeeTime{
	key externalCode:String(100);
	approvalStatus:String(100);
	startDate:DateTime;
	endDate:DateTime;
	timeType:String(100);
	userId:String(100);
	quantityInDays: Decimal(5,1);
}
//=================
entity PerPersonRelationship {
	key personIdExternal: String(100);
	key relatedPersonIdExternal: String(100);
	startDate: Date;
	endDate: Date;
	firstName:String(75);
	lastName:String(75);
	customString6: String(50);
	relationshipType: String(55);
}


   
    entity INFLIGHT_SCHOLAR{
    key	effectiveStartDate:DateTime;
	key	externalCode:String;
		createdBy:String;	
		createdDateTime	:DateTime; //datetimeoffset	
		cust_country:String;
		cust_courseEndDate	:DateTime;	
		cust_courseStartDate	:DateTime;	
		cust_cumulativeGPA	:Decimal;
		cust_cumulativeGPA2	:String;	
		cust_expectedCourseEndDate	:DateTime;	
		cust_nomenclature	:String;	
		cust_nomenclature2	:String;	
		cust_programme1	:String;	
		cust_programme2	:String;	
		cust_remarks	:String;	
		cust_school	:String;	
		cust_semesterGPA :Decimal;	
		cust_semesterGPA2	:String;	
		cust_semesterTrimester	:String;	
		cust_year	:String;	
		externalName	:String;	
		lastModifiedBy	:String;	
		lastModifiedDateTime	:DateTime;//datetimeoffset	
		mdfSystemEffectiveEndDate 	:DateTime;	
		mdfSystemRecordStatus	:String;	

    }
    entity SCHOLAR_SCHEME{
    key effectiveStartDate	:DateTime;
	key	externalCode	:String;	
		externalName	:String;	
		createdBy	:String;	
		createdDateTime	:DateTime;//datetimeoffset	
		cust_SDFCap	:Decimal;	
		cust_allocatedCluster	:String;	
		cust_allocatedInstitution	:String;	
		cust_awardType	:String;	
		cust_bondPeriod	:Decimal;
		cust_discipline	:String;	
		cust_fundingCluster	:LargeString;	
		cust_fundingMOH	:LargeString;	
		cust_fundingRemarks	:String;	
		cust_localOverseas	:String;	
		cust_pFileLocation	:String;	
		cust_scholarshipScheme	:String;	
		cust_scholarshipSignDate	:DateTime;	
		cust_suretyAddress1	:String;	
		cust_suretyAddress2	:String;	
		cust_suretyContact1	:String;	
		cust_suretyContact2	:String;	
		cust_suretyEmail1	:String;	
		cust_suretyEmail2	:String;	
		cust_suretyName1	:String;	
		cust_suretyName2	:String;	
		cust_suretyRelationship1	:String;	
		cust_suretyRelationship2	:String;	
		cust_yearOfAward	:String;	
		lastModifiedBy	:String;	
		lastModifiedDateTime	:DateTime;//datetimeoffset	
		mdfSystemEffectiveEndDate	:DateTime;	
		mdfSystemRecordStatus	:String;	
    }
    
    entity BANK_ACC{
    key	effectiveStartDate	:DateTime;	
	key	externalCode	:String;	
		createdBy	:String;	
		createdDateTime	:DateTime;//datetimeoffset	
		cust_accountOwner	:String;	
		cust_bankAccountNumber	:String;	
		cust_bankBranchCode	:String;	
		cust_bankCode	:String;	
		cust_bankName	:String;	
		cust_currency	:String;	
		cust_primaryBankAccount	:Boolean;
		cust_primaryBankAccountStr: String;
		cust_vendorCode	:String;	
		externalName	:String;	
		lastModifiedBy	:String;	
		lastModifiedDateTime :DateTime;//datetimeoffset	
		mdfSystemEffectiveEndDate	:DateTime;	
		// mdfSystemEffectiveEndDate	:String;	

    }
    
    entity OVERSEAS_BANK{
    // key	cust_bankAccount	:DateTime;	
    key	cust_bankAccount	: String;
	key	cust_bankAccount_externalCode	:String;	
	// key	cust_bankAccount_externalCode	:LargeString;	
		createdBy	:String;	
		createdDateTime	:DateTime;//datetimeoffset		
		cust_IBAN	:String;	
		cust_accountOwner	:String;	
		cust_bank	:String;	
		cust_bankAccountNumber	:String;	
		cust_currency	:String;	
		cust_primaryBank :Boolean;	
		cust_primaryBankStr :String;	
		cust_sortCode	:String;	
		cust_swiftCode	:String;	
		externalName	:String;	
		lastModifiedBy	:String;	
		lastModifiedDateTime	:DateTime;//datetimeoffset		
		mdfSystemRecordStatus	:String;	

    }
    
    entity PER_NATIONALID{
		    key	personIdExternal : String;
			key cardType: String;
			key country: String;
				createdBy: String;
				attachmentId: String;
				createdDateTime: DateTime;
				createdOn: DateTime;
				customDate1: DateTime;
				customString1: String;
				isPrimary:Boolean;
				lastModifiedBy: String;
				lastModifiedDateTime: DateTime;
				lastModifiedOn: DateTime;
				nationalId: String;
				notes: String;
				operation: String;
    }

define view EmployeeInformation with parameters UserID:String(20) as select from PerPersonalView as PerPersonal 
left join EmpJob as EmpJob on EmpJob.userId = PerPersonal.personIdExternal 
distinct 
{
	key PerPersonal.personIdExternal,
		EmpJob.payGrade,
		EmpJob.employeeClass,
		EmpJob.customString3 as Specialisation,
		EmpJob.customString4 as Sponsor,
		EmpJob.company as Personal_Area,
		EmpJob.location as Personal_Sub_Area,
		EmpJob.department,
		EmpJob.division,
		EmpJob.employeeType,
		EmpJob.managerid,
		EmpJob.startDate,
		EmpJob.endDate,
		EmpJob.seqNumber
}
where PerPersonal.personIdExternal = :UserID;

define view EmployeeInformationforElig with parameters UserID:String(20) as select from PerPersonalView as PerPersonal 
left join EmpJob as EmpJob on EmpJob.userId = PerPersonal.personIdExternal 
distinct 
{
	key PerPersonal.personIdExternal,
		EmpJob.payGrade,
		EmpJob.employeeClass,
		EmpJob.customString3 as Specialisation,
		EmpJob.customString4 as Sponsor,
		EmpJob.company as Personal_Area,
		EmpJob.location as Personal_Sub_Area,
		EmpJob.department,
		EmpJob.division,
		EmpJob.employeeType,
		EmpJob.managerid,
		EmpJob.startDate,
		EmpJob.endDate,
		EmpJob.seqNumber
}
where PerPersonal.personIdExternal = :UserID and EmpJob.startDate <= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS') and EmpJob.endDate >= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS');

define view MaxEmpWorkPermit with parameters UserID:String(20) as select from EmpWorkPermit {
	userid,
	documentType,
	max(expirationDate) as expirationDate
}  where ( EmpWorkPermit.userid = : UserID or EmpWorkPermit.userid = 'ALL' ) group by userid,documentType;

define view DistinctEmployeeEligibility with parameters EmpID:String(20) as select from db.Benefit_Eligibility as Benefit 
inner join EmployeeInformationforElig(UserID: :EmpID) as EmpInfo on ( Benefit.Pay_Grade = EmpInfo.payGrade OR Benefit.Pay_Grade = 'ALL' )
	and ( Benefit.Specialisation = EmpInfo.Specialisation OR Benefit.Specialisation = 'ALL' )
	and ( Benefit.Personal_Area = EmpInfo.Personal_Area OR Benefit.Personal_Area = 'ALL' )
	and ( Benefit.Personal_Sub_Area = EmpInfo.Personal_Sub_Area  OR Benefit.Personal_Sub_Area = 'ALL' )
	and ( Benefit.Employee_Class = EmpInfo.employeeClass  OR Benefit.Employee_Class = 'ALL' )
inner join MaxEmpWorkPermit(UserID: :EmpID) as WorkPermit on ( Benefit.Document_Type = WorkPermit.documentType OR Benefit.Document_Type = 'ALL' )
{
	key Benefit.Claim_Code,
	   min(Benefit.Sequence) as Sequence,
   	// key Benefit.Effective_Date,
   	// key Benefit.End_Date,
	   //	Benefit.Description,
	   //	Benefit.Personal_Area,
	   //	Benefit.Personal_Sub_Area,
	   //	Benefit.Employee_Class,
	   //	Benefit.Pay_Grade,
	   //	Benefit.Document_Type,
	   //	Benefit.Specialisation,
	   //	Benefit.Basic_Pay,
	   //	Benefit.Entitlement
} group by Benefit.Claim_Code;

define view EmployeeEligibility with parameters EmpID:String(20) as select from db.Benefit_Eligibility as Benefit 
// inner join EmployeeInfomation(UserID: :EmpID) as EmpInfo on Benefit.Pay_Grade = EmpInfo.payGrade
// and Benefit.Specialisation = EmpInfo.Specialisation
// and Benefit.Personal_Area = EmpInfo.Personal_Area
// and Benefit.Personal_Sub_Area = EmpInfo.Personal_Sub_Area
inner join DistinctEmployeeEligibility(EmpID: :EmpID) as DistinctEmpElig
on DistinctEmpElig.Claim_Code = Benefit.Claim_Code and DistinctEmpElig.Sequence = Benefit.Sequence
{
	key Benefit.Claim_Code,
	key Benefit.Sequence,
   	key Benefit.Effective_Date,
   	key Benefit.End_Date,
	   	Benefit.Description,
	   	Benefit.Personal_Area,
	   	Benefit.Personal_Sub_Area,
	   	Benefit.Employee_Class,
	   	Benefit.Pay_Grade,
	   	Benefit.Document_Type,
	   	Benefit.Specialisation,
	   	Benefit.Basic_Pay,
	   	Benefit.Entitlement,
	   	//Added by Sahas for Vinoth new fields
	    Benefit.Category_Code,
		Benefit.Category_Desc
};

define view EmpJobPartTime as select from EmpJob{
	*
}where employeeType in ('CP','PP','PT') order by seqNumber;
	
define view v_FOLocation as select from FOLocation{
*	
};

// define view calPayLeave with parameters sdate:Date,edate:Date as select from EmployeeTime{
// 	sum(quantityInDays) as sum,
// 	key userId
// }where externalCode in ('1211', '1212', '1213', '1214', '1215', '1216', '1217') and endDate <= :edate and startDate >= :sdate
// group by userId;

@cds.query.limit.default: 100000
define view EmpJobPayCompRecurring as select from EmpJob as EmpJob
inner join EmpEmployment as empEmp on empEmp.userId = EmpJob.userId
left join EmpPayCompRecurring as EmpPayCompRecurring on (EmpJob.userId = EmpPayCompRecurring.userid and EmpPayCompRecurring.paycomponent = '1002') 
left join PerPersonalView as PerInfo on (PerInfo.personIdExternal = EmpJob.userId)
distinct {
	key EmpJob.userId,
	key EmpJob.startDate,
	key EmpJob.seqNumber,
		EmpJob.payGrade,
		EmpJob.employeeClass,
		EmpJob.customString3 as Specialisation,
		EmpJob.customString4 as Sponsor,
		EmpJob.company as Personal_Area,
		EmpJob.location as Personal_Sub_Area,
		EmpJob.department,
		EmpJob.division,
		EmpJob.employeeType,
		EmpJob.managerid,
		EmpJob.standardHours,
		EmpPayCompRecurring.paycomponent,
		EmpPayCompRecurring.paycompvalue,
		PerInfo.firstName,
		PerInfo.lastName,
		PerInfo.fullName,
		case when (empEmp.startDate <= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS') 
		and (empEmp.endDate >= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS')
		or empEmp.endDate IS NULL)) then 
		'X' else '' end as UserStatus:String
} where EmpJob.startDate <= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS') 
and EmpJob.endDate >= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS');

	entity Replication_Logs {
		key Rep_Log_ID: String(50);
		key Rep_Timestamp: DateTime;
		key Internal_Claim_Reference: String(100);
			Claim_Status: String(50);
			Rep_Type: String(50);
			Rep_Status: String(20);
			Message: String;
			Employee_ID: String(100);
			Claim_Ref_Number: String(100);
			Pay_Component: String(50);
			Effective_Date: Date;
			Claim_Amount: Decimal(10, 2);
			Unit: Decimal(10, 2);
			Sequence: Integer;
	}
	
	entity SMS_Replication_Logs {
		key Rep_Log_ID: String(50);
		key Rep_Timestamp: DateTime;
		key Internal_Claim_Reference: String(100);
			Master_Claim_Reference: String(100);
			Export_Reference: String(50);
			Category_Code: String(50);
			Claim_Status: String(50);
			Rep_Status: String(20);
			Message: String;
			Employee_ID: String(100);
			Company_Code: String(10);
			Receipt_Date: Date;
			File_Generation_Date: Date;
			Doc_Type: String(10);
			Currency: String(20);
			Invoice_Number: String(100);
			Header: String(50);
			Posting_Key: String(10);
			Vendor_GL_Code: String(100);
			Cost_Center: String(10);
			Amount: Decimal(10, 2);
			Tax_Indicator: String(10);
			Tax_Code: String(10);
			Remarks: String(256);
			Master_Table_Name: String(100);
			Lineitem_Table_Name: String(100);
	}
	
	entity SMS_Import_Posting_Upload {
	   key id: String(1);
	   @Core.MediaType: mediaType
	   content : LargeBinary ;
	   @Core.IsMediaType: true
	   mediaType : String;
	   fileName : String;
	}
	
	entity SMS_Import_Posting_Upload_Logs {
		key Log_Id: String(50);
		key Timestamp: DateTime;
		Employee_ID: String(100);
		Employee_Name: String(100);
		Posting_Date: Date;
		Posting_Amount: Decimal(10, 2);
		Invoice_Number: String(100);
		Currency: String(20);
		Export_Reference: String(100);
		Category_Code: String(50);
		Master_Claim_Reference: String(100);
		Internal_Claim_Reference: String(100);
		Status: String(20);
		Message: String;
		File_Name: String(150);
		Company_Code: String(20);
		FI_Document_No: String(50);
		Fiscal_Year: String(4);
		Item_Description: String;
		Remarks: String;
	}
	
	entity Master_Employee_Type {
    	key COMPANY:String(50);
    	key EMPLOYEE_TYPE_CODE:String(150);
    		EMPLOYEE_TYPE_DESC:String(150);
    }
	
	define view EmployeeInformationall as select from PerPersonalView as PerPersonal 
left join EmpJob as EmpJob on EmpJob.userId = PerPersonal.personIdExternal 
and EmpJob.startDate <= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS') and EmpJob.endDate >= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS')
{
	key PerPersonal.personIdExternal,
		EmpJob.payGrade,
		EmpJob.employeeClass,
		EmpJob.customString3 as Specialisation,
		EmpJob.customString4 as Sponsor,
		EmpJob.company as Personal_Area,
		EmpJob.location as Personal_Sub_Area,
		EmpJob.department,
		EmpJob.division,
		EmpJob.employeeType,
		EmpJob.managerid,
		EmpJob.startDate,
		EmpJob.endDate
};

define view MaxEmpWorkPermitall as select from EmpWorkPermit {
	userid,
	documentType,
	max(expirationDate) as expirationDate
}  group by userid,documentType;

define view DistinctEmployeeEligibilityall as select from db.Benefit_Eligibility as Benefit 
inner join EmployeeInformationall as EmpInfo on ( Benefit.Pay_Grade = EmpInfo.payGrade OR Benefit.Pay_Grade = 'ALL' )
	and ( Benefit.Specialisation = EmpInfo.Specialisation OR Benefit.Specialisation = 'ALL' )
	and ( Benefit.Personal_Area = EmpInfo.Personal_Area OR Benefit.Personal_Area = 'ALL' )
	and ( Benefit.Personal_Sub_Area = EmpInfo.Personal_Sub_Area  OR Benefit.Personal_Sub_Area = 'ALL' )
	and ( Benefit.Employee_Class = EmpInfo.employeeClass  OR Benefit.Employee_Class = 'ALL' )
inner join MaxEmpWorkPermitall as WorkPermit 
on ( Benefit.Document_Type = WorkPermit.documentType OR Benefit.Document_Type = 'ALL' )
and ( EmpInfo.personIdExternal = WorkPermit.userid OR WorkPermit.userid = 'ALL' )
{
	key Benefit.Claim_Code,
	   min(Benefit.Sequence) as Sequence,
		EmpInfo.personIdExternal,
	   	EmpInfo.payGrade,
		EmpInfo.Personal_Area,
		EmpInfo.Personal_Sub_Area,
		EmpInfo.department,
		EmpInfo.division
   	// key Benefit.Effective_Date,
   	// key Benefit.End_Date,
	   //	Benefit.Description,
	   //	Benefit.Personal_Area,
	   //	Benefit.Personal_Sub_Area,
	   //	Benefit.Employee_Class,
	   //	Benefit.Pay_Grade,
	   //	Benefit.Document_Type,
	   //	Benefit.Specialisation,
	   //	Benefit.Basic_Pay,
	   //	Benefit.Entitlement
} group by Benefit.Claim_Code,
		EmpInfo.personIdExternal,	
		EmpInfo.payGrade,
		EmpInfo.Personal_Area,
		EmpInfo.Personal_Sub_Area,
		EmpInfo.department,
		EmpInfo.division;

define view EmployeeEligibilityall as select from db.Benefit_Eligibility as Benefit 
// inner join EmployeeInfomation(UserID: :EmpID) as EmpInfo on Benefit.Pay_Grade = EmpInfo.payGrade
// and Benefit.Specialisation = EmpInfo.Specialisation
// and Benefit.Personal_Area = EmpInfo.Personal_Area
// and Benefit.Personal_Sub_Area = EmpInfo.Personal_Sub_Area
inner join DistinctEmployeeEligibilityall as DistinctEmpElig
on DistinctEmpElig.Claim_Code = Benefit.Claim_Code and DistinctEmpElig.Sequence = Benefit.Sequence
{
	key Benefit.Claim_Code,
	key Benefit.Sequence,
   	key Benefit.Effective_Date,
   	key Benefit.End_Date,
	   	Benefit.Description,
	   	Benefit.Personal_Area,
	   	Benefit.Personal_Sub_Area,
	   	Benefit.Employee_Class,
	   	Benefit.Pay_Grade,
	   	Benefit.Document_Type,
	   	Benefit.Specialisation,
	   	Benefit.Basic_Pay,
	   	Benefit.Entitlement,
	   	//Added by Sahas for Vinoth new fields
	    Benefit.Category_Code,
		Benefit.Category_Desc,
		DistinctEmpElig.personIdExternal,
		DistinctEmpElig.payGrade as Employee_paygrade,
		DistinctEmpElig.Personal_Area as Employee_perarea,
		DistinctEmpElig.Personal_Sub_Area as Employee_persubarea,
		DistinctEmpElig.department as Employee_department,
		DistinctEmpElig.division as Employee_division
};

define view PerPersonalView as select from PerPersonal {
		personIdExternal,
		// max(startDate) as startDate,
		startDate,
		endDate,
		firstName,
		lastName,
		customString2 as fullName
// } group by firstName,personIdExternal,lastName
}where startDate <= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS') and endDate >= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS');

	
define view EmpJobView with parameters YearValue:String(10)	as select from EmpJob as Job
left join cal.YTD_EMPLOYEE_CLAIM_STATUS as YTD
on YTD.EMPLOYEE_ID = Job.userId
// and (YTD.STATUS = 'U' or YTD.STATUS = null)
distinct{
	key Job.userId,
		YTD.STATUS,
		YTD.YEAR as YearV
} 
where Job.startDate <= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS') 
and Job.endDate >= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS')
and (YTD.YEAR = :YearValue or YTD.YEAR is null) and (YTD.STATUS ='U' or YTD.STATUS is null);
	
define view INFT_SCHOLAR_SCHEME as select from INFLIGHT_SCHOLAR as scholar
inner join SCHOLAR_SCHEME as scheme
on scheme.externalCode = scholar.externalCode
// and scheme.effectiveStartDate = scholar.effectiveStartDate
{
	// scholar.createdBy,
		// scholar.createdDateTime,	
	key scholar.externalCode,
	key scholar.effectiveStartDate,
		scholar.cust_country,
		scholar.cust_courseEndDate,	
		scholar.cust_courseStartDate,	
		scholar.cust_cumulativeGPA,
		scholar.cust_cumulativeGPA2,	
		scholar.cust_expectedCourseEndDate,	
		scholar.cust_nomenclature,	
		scholar.cust_nomenclature2,	
		scholar.cust_programme1,	
		scholar.cust_programme2,	
		scholar.cust_remarks,	
		scholar.cust_school,	
		scholar.cust_semesterGPA,	
		scholar.cust_semesterGPA2,	
		scholar.cust_semesterTrimester,	
		scholar.cust_year,
		// scholar.externalName,	
		// scholar.lastModifiedBy,	
		// scholar.lastModifiedDateTime,	
		// lastModifiedDateTime	:DateTime;	
		scholar.mdfSystemRecordStatus,
	// key scheme.effectiveStartDate,
	// key	scheme.externalCode,	
	// 	scheme.externalName,	
	// 	scheme.createdBy,	
	// 	scheme.createdDateTime,
		scheme.cust_SDFCap,	
		// scheme.cust_allocatedCluster,
		// scheme.cust_allocatedInstitution,	
		// scheme.cust_awardType,	
		// scheme.cust_bondPeriod,
		// scheme.cust_discipline,
		// scheme.cust_fundingCluster,	
		// scheme.cust_fundingMOH,	
		// scheme.cust_fundingRemarks,
		// scheme.cust_localOverseas,
		// scheme.cust_pFileLocation,
		// scheme.cust_scholarshipScheme,	
		// scheme.cust_scholarshipSignDate,	
		// scheme.cust_suretyAddress1,	
		// scheme.cust_suretyAddress2,	
		// scheme.cust_suretyContact1,	
		// scheme.cust_suretyContact2,	
		// scheme.cust_suretyEmail1,	
		// scheme.cust_suretyEmail2,	
		// scheme.cust_suretyName1,	
		// scheme.cust_suretyName2,	
		// scheme.cust_suretyRelationship1,
		// scheme.cust_suretyRelationship2,	
		// scheme.cust_yearOfAward,	
		// scheme.lastModifiedBy,	
		// scheme.lastModifiedDateTime,
		// scheme.mdfSystemEffectiveEndDate,
		// scheme.mdfSystemRecordStatus,
	
};

define view Total_Disbursement as select from SCHOLAR_SCHEME as schscheme
left join db.DISBURSMENT_CHARGEOUT_CLAIM as claim
on claim.EMPLOYEE_ID = schscheme.externalCode
{
	schscheme.externalCode,
	schscheme.effectiveStartDate,
	schscheme.cust_yearOfAward,
	schscheme.cust_scholarshipScheme,
	 sum(claim.CLAIM_AMOUNT) as total_disbursement
}
group by schscheme.cust_yearOfAward,schscheme.cust_scholarshipScheme,schscheme.effectiveStartDate,schscheme.externalCode;
	
define view CHARGE_PAYABLE_OUT as select from SCHOLAR_SCHEME as schscheme
left join Total_Disbursement as Disbursement
on Disbursement.cust_yearOfAward = schscheme.cust_yearOfAward
and Disbursement.cust_scholarshipScheme = schscheme.cust_scholarshipScheme
and Disbursement.effectiveStartDate = schscheme.effectiveStartDate
and Disbursement.externalCode = schscheme.externalCode
{
		schscheme.externalCode,
		schscheme.effectiveStartDate,
		schscheme.cust_yearOfAward,
		schscheme.cust_scholarshipScheme,
		schscheme.cust_fundingMOH,
		schscheme.cust_fundingCluster,
		schscheme.cust_allocatedCluster,
		(cast(schscheme.cust_fundingCluster as Decimal(10,2)) * Disbursement.total_disbursement) as Payable_moh,
		(cast(schscheme.cust_fundingMOH as Decimal(10,2)) * Disbursement.total_disbursement) as Payable_cluster
};
}