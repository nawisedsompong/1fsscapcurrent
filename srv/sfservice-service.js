const cds = require('@sap/cds');
const dbClass = require("sap-hdbext-promisfied");
const hdbext = require("@sap/hdbext");
const ShortUniqueId = require('short-unique-id');
const uid = new ShortUniqueId({ length: 8, dictionary: 'alphanum'});
const smsuid = new ShortUniqueId({ length: 10, dictionary: 'alphanum'});
const prorationRule = require('./proration-rule-util');
const Excel = require("exceljs");
const excelnode = require("node-xlsx");
const { Readable, PassThrough } = require('stream');
	// const uuid = require("uuid/v4");

module.exports = async(srv) => {
	const {
		SMS_Replication_Logs,
		Replication_Logs,
		EmpJob,
		SMS_Import_Posting_Upload,
		SMS_Import_Posting_Upload_Logs,
		SMS_Excel_Upload_Logs
	} = srv.entities('sf');
	
	const {
		EmployeeEligibility
	} = srv.entities('benefit');
	
	srv.on('masterDataSync', async (req) => {
		try {
			let data = req.data;
			const db = await cds.connect.to("db");
			let dbConn = new dbClass(await dbClass.createConnection(db.options.credentials));
			let storedProcedureObj = await dbConn.loadProcedurePromisified(hdbext, null, 'proc_master_data_sync');
			let result = await dbConn.callProcedurePromisified(storedProcedureObj, [data.DEPARTMENT, data.DIVISION, data.PA, data.PSA, data.SPECIALISATION, data.SPONSOR, data.PAY_GRADE]);
			console.log('Master Data Sync Result:', result);
			if (result && result.outputScalar && result.outputScalar.LT_MSG_OUT) {
				return {
					message: result.outputScalar.LT_MSG_OUT
				};
			} else {
				return {
					message: result
				};
			}
		} catch(err) {
			console.log('Master Data Sync Error:', err);
			req.reject(422, err);
		}
	});
	
	/*srv.on('exportChargeOutExcelReport', async (req) => {
		let filters = validateFilterValues(req);
		const tx = cds.transaction(req);
		const tableWithLineItem = [{
			masterTable: 'BENEFIT_SDFC_MASTER_CLAIM',
			lineItemTable: 'BENEFIT_SDFC_LINEITEM_CLAIM'
		}, {
			masterTable: 'BENEFIT_CPC_MASTER_CLAIM',
			lineItemTable: 'BENEFIT_CPC_LINEITEM_CLAIM'
		}, {
			masterTable: 'BENEFIT_OC_MASTER_CLAIM',
			lineItemTable: 'BENEFIT_OC_LINEITEM_CLAIM'
		}, {
			masterTable: 'BENEFIT_PAY_UP_MASTER_CLAIM',
			lineItemTable: 'BENEFIT_PAY_UP_LINEITEM_CLAIM'
		}];
		
		let payableResult = await getChargeOutData(tx, tableWithLineItem, filters);
		
	});
	
	async function getPayableData(tx, tables, filters) {
		for (let i = 0; i < tables.length; i++) {
			await tx.run(`
				
			`);
		}
	}
	
	function validateFilterValues(req) {
		let filters = req.data;
		if (!filters.Cluster) {
			return req.reject(400, "Cluster value required.");
		}
		if (!filters.Scholarship_Scheme) {
			return req.reject(400, "Scholarship Scheme value required.");
		}
		if (!filters.Year_Of_Award) {
			return req.reject(400, "Year of Award value required.");
		}
		if (!filters.Scholar_Status) {
			return req.reject(400, "Scholar Status value required.");
		}
		if (!filters.From_Date) {
			return req.reject(400, "From Date value required.");
		}
		if (!filters.To_Date) {
			return req.reject(400, "To Date value required.");
		}
		if (isNaN(parseInt(filters.Year_Of_Award))) {
			return req.reject(400, "Invalid Year of Award value.");
		}
		return filters;
	}*/
	
	srv.on('UPDATE', 'SMS_Import_Posting_Upload', async(req, res) => {
		var postingType = req.data.id;
		if (postingType !== 'M') {
			req.reject(400, 'Invalid ID parameter. It must be "M"');
		}
		if (req.data.content) {
			const contentType = req._.req.headers['content-type'];
			var content, workSheetsFromBuffer, rowArray = [],
				keyHeader = [],
				entries = [],
				entriesMaster = [],
				claimStatus = [],
				approvalEntries = [],
				tableArray = [];
			const stream = new PassThrough();
			const chunks = [];
			let request = req;
			stream.on('data', chunk => {
				chunks.push(chunk);
			});
			stream.on('end', async() => {
				let media = Buffer.concat(chunks).toString('base64');
				const readable = new Readable();
				const decodedMedia = new Buffer(media.split(';base64,').pop(), 'base64');
				readable.push(decodedMedia);
				readable.push(null);
				const workbook = new Excel.Workbook();
				await workbook.xlsx.read(readable);
				let numberofWroksheet = workbook._worksheets.length;
				
				for (var numw = 1; numw < numberofWroksheet; numw++) {
					var worksheet = workbook.getWorksheet(numw);
					rowArray = [];
					await worksheet.eachRow({
						includeEmpty: true
					}, function (row, rowNumber) {
						console.log("Row " + rowNumber + " = " + JSON.stringify(row.values));
						var rowaftersplice = Object.assign([], row.values);
						rowaftersplice.splice(0, 1)
						if (rowNumber == 1) {
							keyHeader = rowaftersplice;
						} else {
							if (rowaftersplice.length > 0) {
								rowArray.push(rowaftersplice);
							}
						}
					});

					for (var i = 0; i < rowArray.length; i++) {
						var result = {};
						keyHeader.forEach((key, j) => {
							if (key === 'Posting_Date') {
								if (rowArray[i][j]) {
									var splittedStrArr = rowArray[i][j].split('.');
									result[key] = splittedStrArr[2] + '-' + splittedStrArr[1] + '-' + splittedStrArr[0];
								} else {
									result[key] = '';
								}
							} else if (key === 'Invoice_Number') {
								if (rowArray[i][j]) {
									rowArray[i][j] = rowArray[i][j].toString();
									result[key] = rowArray[i][j];
								} else {
									result[key] = '';
								}
							} else {
								if (!rowArray[i][j]) {
									result[key] = '';
								} else {
									result[key] = rowArray[i][j];
								}
							}
						});
						entries.push(result);
					}
					console.log(entries);
				}
				
				let entriesUniqueByExportReference = [...new Map(entries.map(item => [item.Export_Reference, item])).values()];
				entries = entriesUniqueByExportReference;
				await manualImportPosting(req, entries);
			});
			req.data.content.pipe(stream);
		} else {
			return next()
		}
	});
	
	async function manualImportPosting(req, entries) {
		var userEmail = req.user.id;
		let convertedCurrentDate = convertTimeZone(new Date(), 'Asia/Singapore');
		var tx = cds.transaction(req);
		await tx.begin();
		var logs = [], currency = 'SGD', employeeId = '', employeeName = '';
		var userResult = await tx.run(`
			SELECT 
				"PER_EMAIL"."PERSONIDEXTERNAL",
				"PER_PERSON"."CUSTOMSTRING2" AS "EMPLOYEE_NAME"
			FROM "SF_PEREMAIL" AS "PER_EMAIL"
			LEFT JOIN "SF_PERPERSONAL" AS "PER_PERSON"
			ON "PER_EMAIL"."PERSONIDEXTERNAL"="PER_PERSON"."PERSONIDEXTERNAL"
			WHERE "EMAILADDRESS"='${userEmail}'
		`);
		if (userResult.length > 0 && userResult[0].PERSONIDEXTERNAL) {
			employeeId = userResult[0].PERSONIDEXTERNAL;
			employeeName = userResult[0].EMPLOYEE_NAME;
		}
		for (var k = 0; k < entries.length; k++) {
			try {
				var repLogsResult = await tx.run(
				`SELECT DISTINCT
					"INTERNAL_CLAIM_REFERENCE",
					"MASTER_CLAIM_REFERENCE",
					"CATEGORY_CODE",
					"MASTER_TABLE_NAME",
					"LINEITEM_TABLE_NAME"
				 FROM "SF_SMS_REPLICATION_LOGS"
				 WHERE "EXPORT_REFERENCE"='${entries[k].Export_Reference}' AND 
					   "REP_STATUS"='Success'`	
				);
				if (repLogsResult.length === 0) {
					logs.push({
						Log_Id: generateRandomID(),
						Timestamp: dateTimeFormat(convertedCurrentDate),
						Employee_ID: employeeId,
						Employee_Name: employeeName,
						Posting_Date: entries[k].Posting_Date,
						Posting_Amount: entries[k].Posting_Amount,
						Invoice_Number: entries[k].Invoice_Number,
						Currency: currency,
						Export_Reference: entries[k].Export_Reference,
						Master_Claim_Reference: '',
						Internal_Claim_Reference: '',
						Status: 'Error',
						Message: 'EXPORT_REFERENCE not found in the system.'
					});
				} else if (!repLogsResult[0].MASTER_TABLE_NAME || !repLogsResult[0].LINEITEM_TABLE_NAME) {
					logs.push({
						Log_Id: generateRandomID(),
						Timestamp: dateTimeFormat(convertedCurrentDate),
						Employee_ID: employeeId,
						Employee_Name: employeeName,
						Posting_Date: entries[k].Posting_Date,
						Posting_Amount: entries[k].Posting_Amount,
						Invoice_Number: entries[k].Invoice_Number,
						Currency: currency,
						Export_Reference: entries[k].Export_Reference,
						Internal_Claim_Reference: '',
						Status: 'Error',
						Message: 'Table name is not maintained correctly in replication logs.'
					});
				} else {
					var claimExist = await tx.run(`SELECT "CLAIM_REFERENCE","ITEM_LINE_REMARKS_EMPLOYEE" FROM "${repLogsResult[0].LINEITEM_TABLE_NAME}" WHERE "CLAIM_REFERENCE"='${repLogsResult[0].INTERNAL_CLAIM_REFERENCE}'`);
					if (claimExist.length === 0) {
						logs.push({
							Log_Id: generateRandomID(),
							Timestamp: dateTimeFormat(convertedCurrentDate),
							Employee_ID: employeeId,
							Employee_Name: employeeName,
							Posting_Date: entries[k].Posting_Date,
							Posting_Amount: entries[k].Posting_Amount,
							Invoice_Number: entries[k].Invoice_Number,
							Currency: currency,
							Export_Reference: entries[k].Export_Reference,
							Internal_Claim_Reference: '',
							Status: 'Error',
							Message: `LINE_ITEM_REFERENCE not found in the system.`
						});
					} else {
						let querySubStr = '';
						if (repLogsResult[0].LINEITEM_TABLE_NAME === 'BENEFIT_SDFC_LINEITEM_CLAIM') {
							querySubStr = `, "CLAIM_AMOUNT_SGD"='${entries[k].Posting_Amount}'`;
						}
						await tx.run(
							`UPDATE "${repLogsResult[0].LINEITEM_TABLE_NAME}" 
							 SET "POST_CLAIM_AMOUNT"='${entries[k].Posting_Amount}', "POST_DATE"='${entries[k].Posting_Date}', "POST_CURRENCY"='${currency}' ${querySubStr}
    						 WHERE "CLAIM_REFERENCE"='${repLogsResult[0].INTERNAL_CLAIM_REFERENCE}'`
						);
						if (!claimExist[0].ITEM_LINE_REMARKS_EMPLOYEE) {
							claimExist[0].ITEM_LINE_REMARKS_EMPLOYEE = 'N/A';
						}
						logs.push({
							Log_Id: generateRandomID(),
							Timestamp: dateTimeFormat(convertedCurrentDate),
							Employee_ID: employeeId,
							Employee_Name: employeeName,
							Posting_Date: entries[k].Posting_Date,
							Posting_Amount: entries[k].Posting_Amount,
							Invoice_Number: entries[k].Invoice_Number,
							Item_Description: claimExist[0].ITEM_LINE_REMARKS_EMPLOYEE,
							Currency: currency,
							Export_Reference: entries[k].Export_Reference,
							Internal_Claim_Reference: repLogsResult[0].INTERNAL_CLAIM_REFERENCE,
							Master_Claim_Reference: repLogsResult[0].MASTER_CLAIM_REFERENCE,
							Category_Code: repLogsResult[0].CATEGORY_CODE,
							Status: 'Success',
							Message: 'Updated successfully.'
						});
					}
				}
			} catch (err) {
				await tx.run(INSERT.into(SMS_Excel_Upload_Logs).entries({
					Log_Id: generateRandomID(),
					Timestamp: dateTimeFormat(convertedCurrentDate),
					Employee_ID: employeeId,
					Employee_Name: employeeName,
					Posting_Date: entries[k].Posting_Date,
					Posting_Amount: entries[k].Posting_Amount,
					Invoice_Number: entries[k].Invoice_Number,
					Currency: currency,
					Export_Reference: entries[k].Export_Reference,
					Internal_Claim_Reference: '',
					Status: 'Error',
					Message: err.message
				}));
			}
		}
		if (logs.length > 0) {
			await tx.run(INSERT.into(SMS_Import_Posting_Upload_Logs).entries(logs));
		}
		await tx.commit();
		return;
	}
	
	srv.on('automatedSMSImportPosting', async (req, res) => {
		var entries = req.data.CLAIMS;
		let convertedCurrentDate = convertTimeZone(new Date(), 'Asia/Singapore');
		var tx = cds.transaction(req);
		var logs = [], currency = 'SGD', employeeId = 'System';
		for (var k = 0; k < entries.length; k++) {
			try {
				if (entries[k].FI_DOCUMENT_NUMBER) {
					entries[k].FI_DOCUMENT_NUMBER = entries[k].FI_DOCUMENT_NUMBER.toString();
				}
				if (entries[k].FISCAL_YEAR) {
					entries[k].FISCAL_YEAR = entries[k].FISCAL_YEAR.toString();
				}
				if (entries[k].POSTING_DATE) {
					entries[k].POSTING_DATE = entries[k].POSTING_DATE.toString();
					entries[k].POSTING_DATE = entries[k].POSTING_DATE.substring(0,4) + '-' + entries[k].POSTING_DATE.substring(4,6)  + '-' + entries[k].POSTING_DATE.substring(6,8);
				}
				if (entries[k].AMOUNT_LOCAL_CURRENCY_SGD) {
					entries[k].AMOUNT_LOCAL_CURRENCY_SGD = parseFloat(entries[k].AMOUNT_LOCAL_CURRENCY_SGD);
				}
				if (entries[k].REFERENCE) {
					entries[k].REFERENCE = entries[k].REFERENCE.toString();
				}
				if (entries[k].ITEM_TEXT) {
					entries[k].ITEM_TEXT = entries[k].ITEM_TEXT.toString();
				}
				if (entries[k].REMARKS) {
					entries[k].REMARKS = entries[k].REMARKS.toString();
					logs.push({
						Log_Id: generateRandomID(),
						Timestamp: dateTimeFormat(convertedCurrentDate),
						Employee_ID: employeeId,
						Posting_Date: entries[k].POSTING_DATE,
						Posting_Amount: entries[k].AMOUNT_LOCAL_CURRENCY_SGD,
						File_Name: entries[k].FILE_NAME,
						Company_Code: entries[k].COMPANY_CODE,
						FI_Document_No: entries[k].FI_DOCUMENT_NUMBER,
						Fiscal_Year: entries[k].FISCAL_YEAR,
						Invoice_Number: entries[k].REFERENCE,
						Item_Description: entries[k].ITEM_TEXT,
						Remarks: entries[k].REMARKS,
						Currency: currency,
						Export_Reference: entries[k].ASSIGNMENT,
						Master_Claim_Reference: '',
						Internal_Claim_Reference: '',
						Status: 'Error',
						Message: entries[k].REMARKS
					});
					continue;
				}
			
				var repLogsResult = await tx.run(
				`SELECT DISTINCT
					"INTERNAL_CLAIM_REFERENCE",
					"MASTER_CLAIM_REFERENCE",
					"CATEGORY_CODE",
					"MASTER_TABLE_NAME",
					"LINEITEM_TABLE_NAME"
				 FROM "SF_SMS_REPLICATION_LOGS"
				 WHERE "EXPORT_REFERENCE"='${entries[k].ASSIGNMENT}' AND 
					   "REP_STATUS"='Success'`	
				);
				if (repLogsResult.length === 0) {
					logs.push({
						Log_Id: generateRandomID(),
						Timestamp: dateTimeFormat(convertedCurrentDate),
						Employee_ID: employeeId,
						Posting_Date: entries[k].POSTING_DATE,
						Posting_Amount: entries[k].AMOUNT_LOCAL_CURRENCY_SGD,
						File_Name: entries[k].FILE_NAME,
						Company_Code: entries[k].COMPANY_CODE,
						FI_Document_No: entries[k].FI_DOCUMENT_NUMBER,
						Fiscal_Year: entries[k].FISCAL_YEAR,
						Invoice_Number: entries[k].REFERENCE,
						Item_Description: entries[k].ITEM_TEXT,
						Currency: currency,
						Export_Reference: entries[k].ASSIGNMENT,
						Master_Claim_Reference: '',
						Internal_Claim_Reference: '',
						Status: 'Error',
						Message: 'EXPORT_REFERENCE not found in the system.'
					});
				} else if (!repLogsResult[0].MASTER_TABLE_NAME || !repLogsResult[0].LINEITEM_TABLE_NAME) {
					logs.push({
						Log_Id: generateRandomID(),
						Timestamp: dateTimeFormat(convertedCurrentDate),
						Employee_ID: employeeId,
						Posting_Date: entries[k].POSTING_DATE,
						Posting_Amount: entries[k].AMOUNT_LOCAL_CURRENCY_SGD,
						File_Name: entries[k].FILE_NAME,
						Company_Code: entries[k].COMPANY_CODE,
						FI_Document_No: entries[k].FI_DOCUMENT_NUMBER,
						Fiscal_Year: entries[k].FISCAL_YEAR,
						Invoice_Number: entries[k].REFERENCE,
						Item_Description: entries[k].ITEM_TEXT,
						Currency: currency,
						Export_Reference: entries[k].ASSIGNMENT,
						Internal_Claim_Reference: '',
						Status: 'Error',
						Message: 'Table name is not maintained correctly in replication logs.'
					});
				} else {
					var claimExist = await tx.run(`SELECT "CLAIM_REFERENCE" FROM "${repLogsResult[0].LINEITEM_TABLE_NAME}" WHERE "CLAIM_REFERENCE"='${repLogsResult[0].INTERNAL_CLAIM_REFERENCE}'`);
					if (claimExist.length === 0) {
						logs.push({
							Log_Id: generateRandomID(),
							Timestamp: dateTimeFormat(convertedCurrentDate),
							Employee_ID: employeeId,
							Posting_Date: entries[k].POSTING_DATE,
							Posting_Amount: entries[k].AMOUNT_LOCAL_CURRENCY_SGD,
							File_Name: entries[k].FILE_NAME,
							Company_Code: entries[k].COMPANY_CODE,
							FI_Document_No: entries[k].FI_DOCUMENT_NUMBER,
							Fiscal_Year: entries[k].FISCAL_YEAR,
							Invoice_Number: entries[k].REFERENCE,
							Item_Description: entries[k].ITEM_TEXT,
							Currency: currency,
							Export_Reference: entries[k].ASSIGNMENT,
							Internal_Claim_Reference: '',
							Status: 'Error',
							Message: `LINE_ITEM_REFERENCE not found in the system.`
						});
					} else {
						let querySubStr = '';
						if (repLogsResult[0].LINEITEM_TABLE_NAME === 'BENEFIT_SDFC_LINEITEM_CLAIM') {
							querySubStr = `, "CLAIM_AMOUNT_SGD"='${entries[k].AMOUNT_LOCAL_CURRENCY_SGD}'`;
						}
						await tx.run(
							`UPDATE "${repLogsResult[0].LINEITEM_TABLE_NAME}" 
							 SET "POST_CLAIM_AMOUNT"='${entries[k].AMOUNT_LOCAL_CURRENCY_SGD}', "POST_DATE"='${entries[k].POSTING_DATE}', "POST_CURRENCY"='${currency}' ${querySubStr}
    						 WHERE "CLAIM_REFERENCE"='${repLogsResult[0].INTERNAL_CLAIM_REFERENCE}'`
						);
						logs.push({
							Log_Id: generateRandomID(),
							Timestamp: dateTimeFormat(convertedCurrentDate),
							Employee_ID: employeeId,
							Posting_Date: entries[k].POSTING_DATE,
							Posting_Amount: entries[k].AMOUNT_LOCAL_CURRENCY_SGD,
							File_Name: entries[k].FILE_NAME,
							Company_Code: entries[k].COMPANY_CODE,
							FI_Document_No: entries[k].FI_DOCUMENT_NUMBER,
							Fiscal_Year: entries[k].FISCAL_YEAR,
							Invoice_Number: entries[k].REFERENCE,
							Item_Description: entries[k].ITEM_TEXT,
							Currency: currency,
							Export_Reference: entries[k].ASSIGNMENT,
							Internal_Claim_Reference: repLogsResult[0].INTERNAL_CLAIM_REFERENCE,
							Master_Claim_Reference: repLogsResult[0].MASTER_CLAIM_REFERENCE,
							Category_Code: repLogsResult[0].CATEGORY_CODE,
							Status: 'Success',
							Message: 'Updated successfully.'
						});
					}
				}
			} catch (err) {
				if (entries[k].REMARKS) {
					entries[k].REMARKS = entries[k].REMARKS.toString();
				} else {
					entries[k].REMARKS = '';
				}
				await tx.run(INSERT.into(SMS_Excel_Upload_Logs).entries({
					Log_Id: generateRandomID(),
					Timestamp: dateTimeFormat(convertedCurrentDate),
					Employee_ID: employeeId,
					Posting_Date: entries[k].POSTING_DATE,
					Posting_Amount: entries[k].AMOUNT_LOCAL_CURRENCY_SGD,
					File_Name: entries[k].FILE_NAME,
					Company_Code: entries[k].COMPANY_CODE,
					FI_Document_No: entries[k].FI_DOCUMENT_NUMBER,
					Fiscal_Year: entries[k].FISCAL_YEAR,
					Invoice_Number: entries[k].REFERENCE,
					Item_Description: entries[k].ITEM_TEXT,
					Remarks: entries[k].REMARKS,
					Currency: currency,
					Export_Reference: entries[k].ASSIGNMENT,
					Internal_Claim_Reference: '',
					Status: 'Error',
					Message: err.message
				}));
			}
		}
		if (logs.length > 0) {
			console.log('Automated Import Posting Logs:', logs);
			await tx.run(INSERT.into(SMS_Import_Posting_Upload_Logs).entries(logs));
		}
		return {
			message: 'Successfully Imported.'
		};
	});
	
	srv.on('SFReplicationSMSClaim', async(req) => {
		const tableWithLineItem = [{
			masterTable: 'BENEFIT_SDFC_MASTER_CLAIM',
			lineItemTable: 'BENEFIT_SDFC_LINEITEM_CLAIM'
		}, {
			masterTable: 'BENEFIT_CPC_MASTER_CLAIM',
			lineItemTable: 'BENEFIT_CPC_LINEITEM_CLAIM'
		}, {
			masterTable: 'BENEFIT_OC_MASTER_CLAIM',
			lineItemTable: 'BENEFIT_OC_LINEITEM_CLAIM'
		}, {
			masterTable: 'BENEFIT_PAY_UP_MASTER_CLAIM',
			lineItemTable: 'BENEFIT_PAY_UP_LINEITEM_CLAIM'
		}];
		try {
			const tx = cds.transaction(req);
			let SGDCurrency = req.data.SGDCurrency;
			let dateRange = validateAndSetReplicationDates(req);
			let result1 = [], scholarNameResult = [], finalResult = [], logs = [];
			for (let k = 0; k < tableWithLineItem.length; k++) {
				result1 = await getSMSReplicationClaims(req, tableWithLineItem[k], dateRange);
				if (result1.length > 0) {
					for (let l = 0; l < result1.length; l++) {
						if (SGDCurrency !== '0') {
							if (SGDCurrency === 'X' && result1[l].CURRENCY !== 'SGD') {
								continue;
							}
							if (SGDCurrency !== 'X' && result1[l].CURRENCY === 'SGD') {
								continue;
							}
						}
						let claimReference = result1[l].CLAIM_REFERENCE;
						let companyCode = 'MOHH', headerText = 'SMS';
						let exportRefNum = dateFormatForClaimReference(new Date()) + "" + smsuid();
						let vendorPostingKey = (result1[l].CLAIM_AMOUNT && parseFloat(result1[l].CLAIM_AMOUNT) >= 0) ? '31' : '21';
						let glPostingKey = (result1[l].CLAIM_AMOUNT && parseFloat(result1[l].CLAIM_AMOUNT) >= 0) ? '40' : '50';
						let vendorCode = (result1[l].VENDOR_CODE) ? result1[l].VENDOR_CODE : '';
						let glAccount = (result1[l].GL_ACCOUNT) ? result1[l].GL_ACCOUNT : '';
						let invoiceDate = (result1[l].INVOICE_DATE) ? dateFormatForClaimReference(result1[l].INVOICE_DATE) : '';
						let docType = (result1[l].CLAIM_AMOUNT && parseFloat(result1[l].CLAIM_AMOUNT) > 0) ? 'YA' : 'YB';
						let employeeId = (tableWithLineItem[k].masterTable === 'BENEFIT_PAY_UP_MASTER_CLAIM') ? result1[l].SCHOLAR_ID : result1[l].EMPLOYEE_ID;
						let remarks = result1[l].ITEM_LINE_REMARKS_EMPLOYEE;
						// Remarks String Sanitization
						if (remarks) {
							remarks = remarks.replace(/[\n\r]+/g, '');
							remarks = remarks.replace(/\s{2,10}/g, ' ');
							let replacer = new RegExp('"', 'g');
							remarks = remarks.replace(replacer, '""');
						} else {
							remarks = 'N/A';
						}
						let scholarName = '';
						result1[l].CLAIM_AMOUNT = (result1[l].CLAIM_AMOUNT && parseFloat(result1[l].CLAIM_AMOUNT) < 0) ? parseFloat(-result1[l].CLAIM_AMOUNT).toString() : result1[l].CLAIM_AMOUNT;
						if (!result1[l].VENDOR_CODE || !result1[l].GL_ACCOUNT) {
							logs.push({
								Rep_Log_ID: generateRandomID(),
								Rep_Timestamp: new Date(),
								Category_Code: result1[l].MASTER_CATEGORY_CODE,
								Master_Claim_Reference: result1[l].MASTER_CLAIM_REFERENCE,
								Internal_Claim_Reference: claimReference,
								Claim_Status: result1[l].CLAIM_STATUS,
								Rep_Status: 'Error',
								Message: `Vendor Code or GL Account not available.`,
								Employee_ID: employeeId,
								Company_Code: companyCode,
								Receipt_Date: result1[l].INVOICE_DATE,
								File_Generation_Date: dateFormat(new Date()),
								Doc_Type: docType,
								Currency: result1[l].CURRENCY,
								Invoice_Number: result1[l].INVOICE_NUMBER,
								Amount: result1[l].CLAIM_AMOUNT,
								Remarks: result1[l].ITEM_LINE_REMARKS_EMPLOYEE
							});
							continue;
						}
						if (!result1[l].INVOICE_NUMBER) {
							scholarNameResult = await tx.run(
								`SELECT "FIRSTNAME", "LASTNAME" FROM "SF_PERPERSONAL" WHERE "PERSONIDEXTERNAL"='${employeeId}'`
							);
							if (scholarNameResult.length > 0) {
								scholarName = scholarNameResult[0].FIRSTNAME + " " + scholarNameResult[0].LASTNAME;
							}
							result1[l].INVOICE_NUMBER = scholarName;
						}
						let vendorCodeItem = {
							EXPORT_REFERENCE: exportRefNum,
							COMPANY_CODE: companyCode,
							RECEIPT_DATE: invoiceDate,
							FILE_GEN_DATE: dateFormatForClaimReference(new Date()),
							DOC_TYPE: docType,
							CURRENCY: result1[l].CURRENCY,
							INVOICE_NUMBER: result1[l].INVOICE_NUMBER,
							HEADER_TEXT: headerText,
							POSTING_KEY: vendorPostingKey,
							VENDOR_GL_CODE: vendorCode,
							COST_CENTER: '',
							AMOUNT: result1[l].CLAIM_AMOUNT,
							TAX_INDICATOR: 'X',
							TAX_CODE: '',
							REMARKS: remarks
						};
						let glAccountItem = {
							EXPORT_REFERENCE: exportRefNum,
							COMPANY_CODE: companyCode,
							RECEIPT_DATE: invoiceDate,
							FILE_GEN_DATE: dateFormatForClaimReference(new Date()),
							DOC_TYPE: docType,
							CURRENCY: result1[l].CURRENCY,
							INVOICE_NUMBER: result1[l].INVOICE_NUMBER,
							HEADER_TEXT: headerText,
							POSTING_KEY: glPostingKey,
							VENDOR_GL_CODE: glAccount,
							COST_CENTER: '22100',
							AMOUNT: result1[l].CLAIM_AMOUNT,
							TAX_INDICATOR: '',
							TAX_CODE: 'IN',
							REMARKS: remarks
						};
						
						finalResult.push(vendorCodeItem);
						finalResult.push(glAccountItem);
								
						logs.push({
							Rep_Log_ID: generateRandomID(),
							Rep_Timestamp: new Date(),
							Category_Code: result1[l].MASTER_CATEGORY_CODE,
							Master_Claim_Reference: result1[l].MASTER_CLAIM_REFERENCE,
							Internal_Claim_Reference: claimReference,
							Export_Reference: exportRefNum,
							Claim_Status: result1[l].CLAIM_STATUS,
							Rep_Status: 'Success',
							Message: `Successfully Replicated`,
							Employee_ID: employeeId,
							Company_Code: companyCode,
							Receipt_Date: result1[l].INVOICE_DATE,
							File_Generation_Date: dateFormat(new Date()),
							Doc_Type: docType,
							Currency: result1[l].CURRENCY,
							Invoice_Number: result1[l].INVOICE_NUMBER,
							Header: headerText,
							Posting_Key: vendorPostingKey,
							Vendor_GL_Code: vendorCode,
							Cost_Center: '',
							Amount: result1[l].CLAIM_AMOUNT,
							Tax_Indicator: 'X',
							Tax_Code: '',
							Remarks: result1[l].ITEM_LINE_REMARKS_EMPLOYEE,
							Master_Table_Name: tableWithLineItem[k].masterTable,
							Lineitem_Table_Name: tableWithLineItem[k].lineItemTable
						});
						
						logs.push({
							Rep_Log_ID: generateRandomID(),
							Rep_Timestamp: new Date(),
							Category_Code: result1[l].MASTER_CATEGORY_CODE,
							Master_Claim_Reference: result1[l].MASTER_CLAIM_REFERENCE,
							Internal_Claim_Reference: claimReference,
							Export_Reference: exportRefNum,
							Claim_Status: result1[l].CLAIM_STATUS, 
							Rep_Status: 'Success',
							Message: `Successfully Replicated`,
							Employee_ID: employeeId,
							Company_Code: companyCode,
							Receipt_Date: result1[l].INVOICE_DATE,
							File_Generation_Date: dateFormat(new Date()),
							Doc_Type: docType,
							Currency: result1[l].CURRENCY,
							Invoice_Number: result1[l].INVOICE_NUMBER,
							Header: headerText,
							Posting_Key: glPostingKey,
							Vendor_GL_Code: glAccount,
							Cost_Center: '22100',
							Amount: result1[l].CLAIM_AMOUNT,
							Tax_Indicator: '',
							Tax_Code: 'IN',
							Remarks: result1[l].ITEM_LINE_REMARKS_EMPLOYEE,
							Master_Table_Name: tableWithLineItem[k].masterTable,
							Lineitem_Table_Name: tableWithLineItem[k].lineItemTable
						});
					}
				}
			}
			if (logs.length > 0) {
				await tx.run(INSERT.into(SMS_Replication_Logs).entries(logs));
			}
			return finalResult;
		} catch(error) {
			req.reject(error);
		}
	});
	
	async function getSMSReplicationClaims(req, table, dateRange) {
		const tx = cds.transaction(req);
		let querySubStr = '';
		if (table.masterTable !== 'BENEFIT_PAY_UP_MASTER_CLAIM') {
			querySubStr = `, "CLAIM_MASTER"."VENDOR_CODE", "CLAIM_MASTER"."GL_ACCOUNT"`;
		}
		let result = await tx.run(
			`SELECT 
				"CLAIM_LINEITEM".*,
				"CLAIM_MASTER"."CLAIM_REFERENCE" AS "MASTER_CLAIM_REFERENCE",
				"CLAIM_MASTER"."CATEGORY_CODE" AS "MASTER_CATEGORY_CODE",
				"CLAIM_MASTER"."CLAIM_STATUS" ${querySubStr}
			FROM "${table.lineItemTable}" AS "CLAIM_LINEITEM"
			INNER JOIN "${table.masterTable}" AS "CLAIM_MASTER"
			ON "CLAIM_LINEITEM"."PARENT_CLAIM_REFERENCE" = "CLAIM_MASTER"."CLAIM_REFERENCE" AND "CLAIM_MASTER"."CLAIM_STATUS"='Approved' AND "CLAIM_LINEITEM"."CLAIM_CODE" NOT IN ('PUCLAW','PURCOD')
			INNER JOIN "BENEFIT_CLAIM_STATUS" AS "STATUS_TABLE"
			ON "CLAIM_MASTER"."CLAIM_REFERENCE"="STATUS_TABLE"."CLAIM_REFERENCE"
			WHERE ("STATUS_TABLE"."TOTAL_LEVEL"='1' AND "CLAIM_MASTER"."FIRST_LEVEL_APPROVED_ON" BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}') OR
		    ("STATUS_TABLE"."TOTAL_LEVEL"='2' AND "CLAIM_MASTER"."SECOND_LEVEL_APPROVED_ON" BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}') OR
		    ("STATUS_TABLE"."TOTAL_LEVEL"='3' AND "CLAIM_MASTER"."THIRD_LEVEL_APPROVED_ON" BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}') OR 
		    ("STATUS_TABLE"."TOTAL_LEVEL"='4' AND "CLAIM_MASTER"."FOURTH_LEVEL_APPROVED_ON" BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}')`
		);
		let duplicateClaimReferences = [];
		for (let i = 0; i < result.length; i++) {
			let repLogData = await tx.run(
				`SELECT "INTERNAL_CLAIM_REFERENCE", "CLAIM_STATUS" FROM "SF_SMS_REPLICATION_LOGS" WHERE "INTERNAL_CLAIM_REFERENCE"='${result[i].CLAIM_REFERENCE}' AND "REP_STATUS"='Success'`
			);
			if (repLogData.length > 0) {
				duplicateClaimReferences.push(result[i].CLAIM_REFERENCE);
			}
		}
		
		// Remove duplicate rows from approved claim result
		for (let j = 0; j < duplicateClaimReferences.length; j++) {
			let index = result.findIndex((item) => {
				return item.CLAIM_REFERENCE === duplicateClaimReferences[j];	
			});
			if (index !== -1) {
				result.splice(index, 1);
			}
		}
		return result;
	}
	
	srv.on('SFReplicationClaim', async(req) => {
		let result1, result2, result3, result4, finalResult = [],
			logs = [];
			
		const tableWithoutLineItem = [
				'BENEFIT_AHP_LIC_MS_WIC_CLAIM',
				'BENEFIT_PC_CLAIM',
				'BENEFIT_PTF_ACL_BCL_CLAIM',
				'BENEFIT_MEDICAL_CLAIM'
			],
			tableWithLineItem = [{
				masterTable: 'BENEFIT_COV_MASTER_CLAIM',
				lineItemTable: 'BENEFIT_COV_LINEITEM_CLAIM'
			}, {
				masterTable: 'BENEFIT_SP_MASTER_CLAIM',
				lineItemTable: 'BENEFIT_SP_LINEITEM_CLAIM'
			}, {
				masterTable: 'BENEFIT_SP1_MASTER_CLAIM',
				lineItemTable: 'BENEFIT_SP1_LINEITEM_CLAIM'
			}, {
				masterTable: 'BENEFIT_SP2_MASTER_CLAIM',
				lineItemTable: 'BENEFIT_SP2_LINEITEM_CLAIM'
			}, {
				masterTable: 'BENEFIT_SP3_MASTER_CLAIM',
				lineItemTable: 'BENEFIT_SP3_LINEITEM_CLAIM'
			}, {
				masterTable: 'BENEFIT_TC_MASTER_CLAIM',
				lineItemTable: 'BENEFIT_TC_LINEITEM_CLAIM'
			}, {
				masterTable: 'BENEFIT_WRC_HR_MASTER_CLAIM',
				lineItemTable: 'BENEFIT_WRC_HR_LINEITEM_CLAIM'
			}];
		const empList = []; let sequence, empExist;
		try {
			const tx = cds.transaction(req);
			let dateRange = validateAndSetReplicationDates(req);
			
			for (let i = 0; i < tableWithoutLineItem.length; i++) {
				result1 = await getReplicationClaims(req, 'SF', tableWithoutLineItem[i], dateRange, false);
				
				if (result1.length > 0) {
					for (let j = 0; j < result1.length; j++) {
						// let repLogData = await tx.run(
						// 	`SELECT "REP_STATUS" FROM "SF_REPLICATION_LOGS" WHERE "INTERNAL_CLAIM_REFERENCE"='${result1[j].CLAIM_REFERENCE}' AND "REP_STATUS"='Success'`
						// );
						// if (repLogData.length === 0) {
						result2 = await tx.run(
							`SELECT "PAY_COMPONENT", "REF_REPLICATION_DATE_TYPE" FROM "BENEFIT_BENEFIT_CLAIM_ADMIN" WHERE "CLAIM_CODE"='${result1[j].CLAIM_CODE}' AND "PAYMENT_MODE"='SF Replication'`
						);
						if (result2.length === 0) {
							logs.push({
								Rep_Log_ID: generateRandomID(),
								Rep_Timestamp: new Date(),
								Internal_Claim_Reference: result1[j].CLAIM_REFERENCE,
								Claim_Status: result1[j].CLAIM_STATUS,
								Rep_Type: 'SF Replication',
								Rep_Status: 'Error',
								Message: `Claim admin configuration not found for this "${result1[j].CLAIM_CODE}"`,
								Employee_ID: result1[j].EMPLOYEE_ID,
								Claim_Amount: result1[j].CLAIM_AMOUNT
							});
						} else {
							if (tableWithoutLineItem[i] === 'BENEFIT_MEDICAL_CLAIM' && result1[j].EXPENSE_TYPE) {
								result2[0].PAY_COMPONENT = 'C050';
							}
							if (result2[0].REF_REPLICATION_DATE_TYPE) {
								var effectiveDate;
								if (result2[0].REF_REPLICATION_DATE_TYPE === "Claim Date") {
									effectiveDate = result1[j].CLAIM_DATE;
								} else if (result2[0].REF_REPLICATION_DATE_TYPE === "Receipt Date") {
									effectiveDate = result1[j].RECEIPT_DATE;
								} else if (result2[0].REF_REPLICATION_DATE_TYPE === "Final Approved Date") {
									effectiveDate = result1[j].EFFECTIVE_DATE;
								} else if (result2[0].REF_REPLICATION_DATE_TYPE === "N/A") {
									continue;
								} else {
									logs.push({
										Rep_Log_ID: generateRandomID(),
										Rep_Timestamp: new Date(),
										Internal_Claim_Reference: result1[j].CLAIM_REFERENCE,
										Claim_Status: result1[j].CLAIM_STATUS,
										Rep_Type: 'SF Replication',
										Rep_Status: 'Error',
										Message: `Claim admin configuration "REF_REPLICATION_DATE_TYPE" is not maintained correctly for this "${result1[j].CLAIM_CODE}"`,
										Employee_ID: result1[j].EMPLOYEE_ID,
										Pay_Component: result2[0].PAY_COMPONENT,
										Claim_Amount: result1[j].CLAIM_AMOUNT
									});
									continue;
								}
								
								empExist = empList.find(item => {
									return item.employeeId === result1[j].EMPLOYEE_ID;
								});
								
								if (empExist) {
									empExist.sequence += 1;
									sequence = empExist.sequence;
								} else {
									empList.push({
										employeeId: result1[j].EMPLOYEE_ID,
										sequence: 1
									});
									sequence = 1;
								}
								let lastSequence = await tx.run(
									`SELECT
										MAX(CAST("SEQUENCENUMBER" AS INT)) AS "MAX_SEQUENCE"
									 FROM "SF_EMPPAYCOMPNONRECURRING" 
									 WHERE "USERID"='${result1[j].EMPLOYEE_ID}'`
								);
								
								if (lastSequence.length > 0 && lastSequence[0] && lastSequence[0].MAX_SEQUENCE) {
									sequence = sequence + parseInt(lastSequence[0].MAX_SEQUENCE, 10);
								}
								
								let claimRefNum = uid();
								let claimAmount = '0', hasClaimAmount = false;
								if (tableWithoutLineItem[i] === "BENEFIT_MEDICAL_CLAIM" && result1[j].CLAIM_CODE.includes('_EFMR')) {
									if (result1[j].CLAIM_STATUS === 'Cancellation Approved') {
										claimAmount = result1[j].CLAIM_AMOUNT;
										hasClaimAmount = true;
									} else if (result1[j].CLAIM_AMOUNT && parseFloat(result1[j].CLAIM_AMOUNT) > 0) {
										claimAmount = result1[j].CLAIM_AMOUNT;
										hasClaimAmount = true;
									}
								} else if (tableWithoutLineItem[i] === "BENEFIT_MEDICAL_CLAIM") {
									if (result1[j].CLAIM_STATUS === 'Cancellation Approved') {
										claimAmount = result1[j].AMOUNT_PAID_VIA_PAYROLL;
										hasClaimAmount = true;
									} else if (result1[j].AMOUNT_PAID_VIA_PAYROLL && parseFloat(result1[j].AMOUNT_PAID_VIA_PAYROLL) > 0) {
										claimAmount = result1[j].AMOUNT_PAID_VIA_PAYROLL;
										hasClaimAmount = true;
									}
								} else {
									claimAmount = result1[j].CLAIM_AMOUNT;
									hasClaimAmount = true;
								}
								if (hasClaimAmount) {
									finalResult.push({
										EMPLOYEE_ID: result1[j].EMPLOYEE_ID,
										CLAIM_REF_NUMBER: claimRefNum,
										PAY_COMPONENT: result2[0].PAY_COMPONENT,
										EFFECTIVE_DATE: effectiveDate,
										CLAIM_AMOUNT: claimAmount,
										SEQUENCE: sequence
									});
									let repLogTimeStamp = new Date();
									await updatePostingEstimatedDate(req, repLogTimeStamp, result1[j].CLAIM_REFERENCE, 'SF Replication');
									logs.push({
										Rep_Log_ID: generateRandomID(),
										Rep_Timestamp: repLogTimeStamp,
										Internal_Claim_Reference: result1[j].CLAIM_REFERENCE,
										Claim_Status: result1[j].CLAIM_STATUS,
										Rep_Type: 'SF Replication',
										Rep_Status: 'Success',
										Message: `Successfully Replicated`,
										Employee_ID: result1[j].EMPLOYEE_ID,
										Claim_Ref_Number: claimRefNum,
										Effective_Date: effectiveDate,
										Pay_Component: result2[0].PAY_COMPONENT,
										Claim_Amount: claimAmount,
										Sequence: sequence
									});	
								}
							} else {
								logs.push({
									Rep_Log_ID: generateRandomID(),
									Rep_Timestamp: new Date(),
									Internal_Claim_Reference: result1[j].CLAIM_REFERENCE,
									Claim_Status: result1[j].CLAIM_STATUS,
									Rep_Type: 'SF Replication',
									Rep_Status: 'Error',
									Message: `Claim admin configuration "REF_REPLICATION_DATE_TYPE" not found for this "${result1[j].CLAIM_CODE}"`,
									Employee_ID: result1[j].EMPLOYEE_ID,
									Pay_Component: result2[0].PAY_COMPONENT,
									Claim_Amount: result1[j].CLAIM_AMOUNT
								});
							}
						}
						// }
					}
				}
			}
			for (let k = 0; k < tableWithLineItem.length; k++) {
				result3 = await getReplicationClaims(req, 'SF', tableWithLineItem[k], dateRange, true);
				
				if (result3.length > 0) {
					for (let l = 0; l < result3.length; l++) {
						// let repLogData = await tx.run(
						// 	`SELECT "REP_STATUS" FROM "SF_REPLICATION_LOGS" WHERE "INTERNAL_CLAIM_REFERENCE"='${result3[l].CLAIM_REFERENCE}' AND "REP_STATUS"='Success'`
						// );
						// if (repLogData.length === 0) {
						let claimAmount, claimReference;
						if (tableWithLineItem[k].masterTable === 'BENEFIT_SP_MASTER_CLAIM' || tableWithLineItem[k].masterTable === 'BENEFIT_SP1_MASTER_CLAIM' ||
							tableWithLineItem[k].masterTable === 'BENEFIT_SP2_MASTER_CLAIM' || tableWithLineItem[k].masterTable === 'BENEFIT_SP3_MASTER_CLAIM') {
							claimAmount = result3[l].MASTER_CLAIM_AMOUNT;
							claimReference = result3[l].PARENT_CLAIM_REFERENCE;
						} else {
							claimAmount = result3[l].CLAIM_AMOUNT;
							claimReference = result3[l].CLAIM_REFERENCE;
						}
						result4 = await tx.run(
							`SELECT "PAY_COMPONENT", "REF_REPLICATION_DATE_TYPE" FROM "BENEFIT_BENEFIT_CLAIM_ADMIN" WHERE "CLAIM_CODE"='${result3[l].CLAIM_CODE}' AND "PAYMENT_MODE"='SF Replication'`
						);
						if (result4.length === 0) {
							logs.push({
								Rep_Log_ID: generateRandomID(),
								Rep_Timestamp: new Date(),
								Internal_Claim_Reference: claimReference,
								Claim_Status: result3[l].CLAIM_STATUS,
								Rep_Type: 'SF Replication',
								Rep_Status: 'Error',
								Message: `Claim admin configuration not found for this "${result3[l].CLAIM_CODE}"`,
								Employee_ID: result3[l].EMPLOYEE_ID,
								Claim_Amount: claimAmount
							});
						} else {
							if (result4[0].REF_REPLICATION_DATE_TYPE) {
								var effectiveDate;
								if (result4[0].REF_REPLICATION_DATE_TYPE === "Claim Date") {
									effectiveDate = result3[l].CLAIM_DATE;
								} else if (result4[0].REF_REPLICATION_DATE_TYPE === "Receipt Date") {
									effectiveDate = result3[l].RECEIPT_DATE;
								} else if (result4[0].REF_REPLICATION_DATE_TYPE === "Final Approved Date") {
									effectiveDate = result3[l].EFFECTIVE_DATE;
								} else if (result4[0].REF_REPLICATION_DATE_TYPE === "N/A") {
									continue;
								} else {
									logs.push({
										Rep_Log_ID: generateRandomID(),
										Rep_Timestamp: new Date(),
										Internal_Claim_Reference: claimReference,
										Claim_Status: result3[l].CLAIM_STATUS,
										Rep_Type: 'SF Replication',
										Rep_Status: 'Error',
										Message: `Claim admin configuration "REF_REPLICATION_DATE_TYPE" is not maintained correctly for this "${result3[l].CLAIM_CODE}"`,
										Employee_ID: result3[l].EMPLOYEE_ID,
										Pay_Component: result4[0].PAY_COMPONENT,
										Claim_Amount: claimAmount
									});
									continue;
								}
								
								empExist = empList.find(item => {
									return item.employeeId === result3[l].EMPLOYEE_ID;
								});
								
								if (empExist) {
									empExist.sequence += 1;
									sequence = empExist.sequence;
								} else {
									empList.push({
										employeeId: result3[l].EMPLOYEE_ID,
										sequence: 1
									});
									sequence = 1;
								}
								
								let lastSequence = await tx.run(
									`SELECT 
										MAX(CAST("SEQUENCENUMBER" AS INT)) AS "MAX_SEQUENCE"
									 FROM "SF_EMPPAYCOMPNONRECURRING" 
									 WHERE "USERID"='${result3[l].EMPLOYEE_ID}'`
								);
								
								if (lastSequence.length > 0 && lastSequence[0] && lastSequence[0].MAX_SEQUENCE) {
									sequence = sequence + parseInt(lastSequence[0].MAX_SEQUENCE, 10);
								}
								
								let claimRefNum = uid();
								finalResult.push({
									EMPLOYEE_ID: result3[l].EMPLOYEE_ID,
									CLAIM_REF_NUMBER: claimRefNum,
									PAY_COMPONENT: result4[0].PAY_COMPONENT,
									EFFECTIVE_DATE: effectiveDate,
									CLAIM_AMOUNT: claimAmount,
									SEQUENCE: sequence
								});
								
								let repLogTimeStamp = new Date();
								await updatePostingEstimatedDate(req, repLogTimeStamp, result3[l].PARENT_CLAIM_REFERENCE, 'SF Replication');
								logs.push({
									Rep_Log_ID: generateRandomID(),
									Rep_Timestamp: repLogTimeStamp,
									Internal_Claim_Reference: claimReference,
									Claim_Status: result3[l].CLAIM_STATUS,
									Rep_Type: 'SF Replication',
									Rep_Status: 'Success',
									Message: `Successfully Replicated`,
									Employee_ID: result3[l].EMPLOYEE_ID,
									Claim_Ref_Number: claimRefNum,
									Effective_Date: effectiveDate,
									Pay_Component: result4[0].PAY_COMPONENT,
									Claim_Amount: claimAmount,
									Sequence: sequence
								});
							} else {
								logs.push({
									Rep_Log_ID: generateRandomID(),
									Rep_Timestamp: new Date(),
									Internal_Claim_Reference: claimReference,
									Claim_Status: result3[l].CLAIM_STATUS,
									Rep_Type: 'SF Replication',
									Rep_Status: 'Error',
									Message: `Claim admin configuration "REF_REPLICATION_DATE_TYPE" not found for this "${result3[l].CLAIM_CODE}"`,
									Employee_ID: result3[l].EMPLOYEE_ID,
									Pay_Component: result4[0].PAY_COMPONENT,
									Claim_Amount: claimAmount
								});
							}
						}
						// }
					}
				}
			}
			if (logs.length > 0) {
				await tx.run(INSERT.into(Replication_Logs).entries(logs));
			}
			return finalResult;
		} catch(error) {
			req.reject(error);
		}
	});
	
	async function updatePostingEstimatedDate(req, dateValue, claimReference, repType) {
		let convertedDate = convertTimeZone(dateValue, 'Asia/Singapore');
		const tx = cds.transaction(req);
		let estimatedPostingDateResult = await tx.run(`
			SELECT "PAY_DATE" FROM "SF_POSTINGESTDATE" 
			WHERE "REP_TYPE"='${repType}' AND 
				  "REP_START_DATE" <= '${dateTimeFormat(convertedDate)}' AND
				  "REP_END_DATE" >= '${dateTimeFormat(convertedDate)}'
		`);
		if (estimatedPostingDateResult.length > 0 && estimatedPostingDateResult[0].PAY_DATE) {
			await tx.run(`
				UPDATE "BENEFIT_APPROVAL"
				SET "ESTIMATEPAYMENTDATE"='${dateFormat(estimatedPostingDateResult[0].PAY_DATE)}' 
				WHERE "CLAIM_REFERENCE"='${claimReference}'
			`);
		}
	}
	
	async function getReplicationClaims(req, replicationType, table, dateRange, hasLineItems) {
		let result1, result2, result3;
		let additionalPositiveValueCancellationClaims = [];
		const tx = cds.transaction(req);
		if (hasLineItems) {
			let querySubString = '';
			if (table.lineItemTable === 'BENEFIT_WRC_HR_LINEITEM_CLAIM' && replicationType === 'SF') {
				querySubString = `AND "CLAIM_LINEITEM"."CLAIM_CODE" IN ('KKH', 'LOCUM', 'MRF', 'NSCNC', 'WRCM') `;
			} else if (table.lineItemTable === 'BENEFIT_WRC_HR_LINEITEM_CLAIM' && replicationType === 'SAP') {
				querySubString = `AND "CLAIM_LINEITEM"."CLAIM_CODE" NOT IN ('KKH', 'LOCUM', 'MRF', 'NSCNC', 'WRCM') `;
			}
			// Scenario 1: Approved Status
			result1 = await tx.run(
				`SELECT 
					"CLAIM_LINEITEM".*,
					"CLAIM_MASTER"."CLAIM_STATUS",
					"CLAIM_MASTER"."CLAIM_AMOUNT" AS "MASTER_CLAIM_AMOUNT",
					CASE 
						WHEN "STATUS_TABLE"."TOTAL_LEVEL"='3' 
						THEN "CLAIM_MASTER"."THIRD_LEVEL_APPROVED_ON"
						WHEN "STATUS_TABLE"."TOTAL_LEVEL"='2' 
						THEN "CLAIM_MASTER"."SECOND_LEVEL_APPROVED_ON"
						ELSE "CLAIM_MASTER"."FIRST_LEVEL_APPROVED_ON"
					END AS "EFFECTIVE_DATE"
				FROM "${table.lineItemTable}" AS "CLAIM_LINEITEM"
				INNER JOIN "${table.masterTable}" AS "CLAIM_MASTER"
				ON "CLAIM_LINEITEM"."PARENT_CLAIM_REFERENCE" = "CLAIM_MASTER"."CLAIM_REFERENCE" AND "CLAIM_MASTER"."CLAIM_STATUS"='Approved' ${querySubString}
				INNER JOIN "BENEFIT_CLAIM_STATUS" AS "STATUS_TABLE"
				ON "CLAIM_MASTER"."CLAIM_REFERENCE"="STATUS_TABLE"."CLAIM_REFERENCE"
				WHERE ("STATUS_TABLE"."TOTAL_LEVEL"='1' AND "CLAIM_MASTER"."FIRST_LEVEL_APPROVED_ON" BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}') OR
					  ("STATUS_TABLE"."TOTAL_LEVEL"='2' AND "CLAIM_MASTER"."SECOND_LEVEL_APPROVED_ON" BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}') OR
					  ("STATUS_TABLE"."TOTAL_LEVEL"='3' AND "CLAIM_MASTER"."THIRD_LEVEL_APPROVED_ON" BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}')`
			);
			
			//Check for duplicate Parent claim references in Sponsorship Tables
			if (table.masterTable === 'BENEFIT_SP_MASTER_CLAIM' || table.masterTable === 'BENEFIT_SP1_MASTER_CLAIM' ||
			    table.masterTable === 'BENEFIT_SP2_MASTER_CLAIM' || table.masterTable === 'BENEFIT_SP3_MASTER_CLAIM') {
				let parentClaimReferences = [], duplicateLineItemClaimReference = [];
				for (let i = 0; i < result1.length; i++) {
					let claimReferenceExist = parentClaimReferences.find(item => {
						return item === result1[i].PARENT_CLAIM_REFERENCE;
					});
					if (claimReferenceExist) {
						duplicateLineItemClaimReference.push(result1[i].CLAIM_REFERENCE);
					} else {
						parentClaimReferences.push(result1[i].PARENT_CLAIM_REFERENCE);
					}
				}
				// Remove duplicate rows from approved claim result
				for (let j = 0; j < duplicateLineItemClaimReference.length; j++) {
					let index = result1.findIndex((item) => {
						return item.CLAIM_REFERENCE === duplicateLineItemClaimReference[j];	
					});
					if (index !== -1) {
						result1.splice(index, 1);
					}
				}
			}
			
			// Check for duplicate records
			let duplicateClaimReferences1 = [];
			for (let i = 0; i < result1.length; i++) {
				let claimReference = result1[i].CLAIM_REFERENCE;
				if (table.masterTable === 'BENEFIT_SP_MASTER_CLAIM' || table.masterTable === 'BENEFIT_SP1_MASTER_CLAIM' ||
			    table.masterTable === 'BENEFIT_SP2_MASTER_CLAIM' || table.masterTable === 'BENEFIT_SP3_MASTER_CLAIM') {
					claimReference = result1[i].PARENT_CLAIM_REFERENCE;
				}
				let repLogData = await tx.run(
					`SELECT "INTERNAL_CLAIM_REFERENCE", "CLAIM_STATUS" FROM "SF_REPLICATION_LOGS" WHERE "INTERNAL_CLAIM_REFERENCE"='${claimReference}' AND "REP_STATUS"='Success'`
				);
				if (repLogData.length > 0) {
					duplicateClaimReferences1.push(result1[i].CLAIM_REFERENCE);
				}
			}
			// Remove duplicate rows from approved claim result
			for (let j = 0; j < duplicateClaimReferences1.length; j++) {
				let index = result1.findIndex((item) => {
					return item.CLAIM_REFERENCE === duplicateClaimReferences1[j];	
				});
				
				if (index !== -1) {
					result1.splice(index, 1);
				}
			}
			
			// Scenario 2: Cancellation Approved Status
			result3 = await tx.run(`
				SELECT 
					"CLAIM_LINEITEM".*,
					"CLAIM_MASTER"."CLAIM_STATUS",
					"CLAIM_MASTER"."CLAIM_AMOUNT" AS "MASTER_CLAIM_AMOUNT",
					"CANCEL_MASTER"."PARENT_CLAIM_REFERENCE" AS "CANCELLED_MASTER_CLAIM_REFERENCE",
					CASE 
						WHEN "STATUS_TABLE"."TOTAL_LEVEL"='3' 
						THEN "CLAIM_MASTER"."THIRD_LEVEL_APPROVED_ON"
						WHEN "STATUS_TABLE"."TOTAL_LEVEL"='2' 
						THEN "CLAIM_MASTER"."SECOND_LEVEL_APPROVED_ON"
						ELSE "CLAIM_MASTER"."FIRST_LEVEL_APPROVED_ON"
					END AS "EFFECTIVE_DATE"
				FROM "${table.lineItemTable}" AS "CLAIM_LINEITEM"
				INNER JOIN "${table.masterTable}" AS "CLAIM_MASTER"
				ON "CLAIM_LINEITEM"."PARENT_CLAIM_REFERENCE" = "CLAIM_MASTER"."CLAIM_REFERENCE" AND "CLAIM_MASTER"."CLAIM_STATUS"='Cancellation Approved' ${querySubString}
				INNER JOIN "BENEFIT_CLAIM_CANCEL_MASTER" AS "CANCEL_MASTER"
				ON "CANCEL_MASTER"."CLAIM_REFERENCE" = "CLAIM_MASTER"."CLAIM_REFERENCE"
				INNER JOIN "BENEFIT_CLAIM_STATUS" AS "STATUS_TABLE"
				ON "CLAIM_MASTER"."CLAIM_REFERENCE"="STATUS_TABLE"."CLAIM_REFERENCE"
				WHERE ("STATUS_TABLE"."TOTAL_LEVEL"='1' AND "CLAIM_MASTER"."FIRST_LEVEL_APPROVED_ON" BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}') OR
					  ("STATUS_TABLE"."TOTAL_LEVEL"='2' AND "CLAIM_MASTER"."SECOND_LEVEL_APPROVED_ON" BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}') OR
					  ("STATUS_TABLE"."TOTAL_LEVEL"='3' AND "CLAIM_MASTER"."THIRD_LEVEL_APPROVED_ON" BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}')
			`);
			
			//Check for duplicate Parent claim references in Sponsorship Tables
			if (table.masterTable === 'BENEFIT_SP_MASTER_CLAIM' || table.masterTable === 'BENEFIT_SP1_MASTER_CLAIM' ||
			    table.masterTable === 'BENEFIT_SP2_MASTER_CLAIM' || table.masterTable === 'BENEFIT_SP3_MASTER_CLAIM') {
				let parentClaimReferences2 = [], duplicateLineItemClaimReference2 = [];
				for (let i = 0; i < result3.length; i++) {
					let claimReferenceExist2 = parentClaimReferences2.find(item => {
						return item === result3[i].PARENT_CLAIM_REFERENCE;
					});
					if (claimReferenceExist2) {
						duplicateLineItemClaimReference2.push(result3[i].CLAIM_REFERENCE);
					} else {
						parentClaimReferences2.push(result3[i].PARENT_CLAIM_REFERENCE);
					}
				}
				// Remove duplicate rows from approved claim result
				for (let j = 0; j < duplicateLineItemClaimReference2.length; j++) {
					let index = result3.findIndex((item) => {
						return item.CLAIM_REFERENCE === duplicateLineItemClaimReference2[j];	
					});
					if (index !== -1) {
						result3.splice(index, 1);
					}
				}
			}
			
			// Check for duplicate records
			let duplicateClaimReferences2 = [];
			for (let l = 0; l < result3.length; l++) {
				let claimReference = result3[l].CLAIM_REFERENCE;
				if (table.masterTable === 'BENEFIT_SP_MASTER_CLAIM' || table.masterTable === 'BENEFIT_SP1_MASTER_CLAIM' ||
			    table.masterTable === 'BENEFIT_SP2_MASTER_CLAIM' || table.masterTable === 'BENEFIT_SP3_MASTER_CLAIM') {
					claimReference = result3[l].PARENT_CLAIM_REFERENCE;
				}
				let repLogData = await tx.run(
					`SELECT "INTERNAL_CLAIM_REFERENCE", "CLAIM_STATUS" FROM "SF_REPLICATION_LOGS" WHERE ("INTERNAL_CLAIM_REFERENCE"='${claimReference}' OR ("INTERNAL_CLAIM_REFERENCE"='${result3[l].CANCELLED_MASTER_CLAIM_REFERENCE}' AND "CLAIM_STATUS"='Approved')) AND "REP_STATUS"='Success'`
				);
				if (repLogData.length === 0) {
					let cancelledClaim = JSON.parse(JSON.stringify(result3[l]));
					if (table.masterTable === 'BENEFIT_SP_MASTER_CLAIM' || table.masterTable === 'BENEFIT_SP1_MASTER_CLAIM' ||
				    table.masterTable === 'BENEFIT_SP2_MASTER_CLAIM' || table.masterTable === 'BENEFIT_SP3_MASTER_CLAIM') {
						cancelledClaim.CLAIM_REFERENCE = cancelledClaim.PARENT_CLAIM_REFERENCE;
						cancelledClaim.PARENT_CLAIM_REFERENCE = cancelledClaim.CANCELLED_MASTER_CLAIM_REFERENCE;
					} else {
						cancelledClaim.CLAIM_REFERENCE = cancelledClaim.CANCELLED_MASTER_CLAIM_REFERENCE;
					}
					cancelledClaim.CLAIM_STATUS = 'Cancelled';
					additionalPositiveValueCancellationClaims.push(cancelledClaim);
				} else {
					let existingDuplicateClaim = repLogData.find((item) => {
						return item.CLAIM_STATUS === 'Cancellation Approved';	
					});
					if (existingDuplicateClaim) {
						duplicateClaimReferences2.push(result3[l].CLAIM_REFERENCE);
					}
				}
			}
			// Remove duplicate rows from Cancellation Approved result
			for (let k = 0; k < duplicateClaimReferences2.length; k++) {
				let index = result3.findIndex((item) => {
					return item.CLAIM_REFERENCE === duplicateClaimReferences2[k];	
				});
				
				if (index !== -1) {
					result3.splice(index, 1);
				}
			}
		} else {
			// Scenario 1: Approved Status
			result1 = await tx.run(
				`SELECT
					"CLAIM_TABLE".*,
					CASE 
						WHEN "STATUS_TABLE"."TOTAL_LEVEL"='3' 
						THEN "CLAIM_TABLE"."THIRD_LEVEL_APPROVED_ON"
						WHEN "STATUS_TABLE"."TOTAL_LEVEL"='2' 
						THEN "CLAIM_TABLE"."SECOND_LEVEL_APPROVED_ON"
						ELSE "CLAIM_TABLE"."FIRST_LEVEL_APPROVED_ON"
					END AS "EFFECTIVE_DATE"
				FROM "${table}" AS "CLAIM_TABLE"
				INNER JOIN "BENEFIT_CLAIM_STATUS" AS "STATUS_TABLE"
				ON "CLAIM_TABLE"."CLAIM_REFERENCE"="STATUS_TABLE"."CLAIM_REFERENCE" AND "CLAIM_TABLE"."CLAIM_STATUS"='Approved'
				WHERE ("STATUS_TABLE"."TOTAL_LEVEL"='1' AND "CLAIM_TABLE"."FIRST_LEVEL_APPROVED_ON" BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}') OR
					  ("STATUS_TABLE"."TOTAL_LEVEL"='2' AND "CLAIM_TABLE"."SECOND_LEVEL_APPROVED_ON" BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}') OR
					  ("STATUS_TABLE"."TOTAL_LEVEL"='3' AND "CLAIM_TABLE"."THIRD_LEVEL_APPROVED_ON" BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}')`
			);
			
			// Check for duplicate records
			let duplicateClaimReferences3 = [];
			for (let i = 0; i < result1.length; i++) {
				let repLogData = await tx.run(
					`SELECT "INTERNAL_CLAIM_REFERENCE", "CLAIM_STATUS" FROM "SF_REPLICATION_LOGS" WHERE "INTERNAL_CLAIM_REFERENCE"='${result1[i].CLAIM_REFERENCE}' AND "REP_STATUS"='Success'`
				);
				if (repLogData.length > 0) {
					duplicateClaimReferences3.push(result1[i].CLAIM_REFERENCE);
				}
			}
			// Remove duplicate rows from approved claim result
			for (let j = 0; j < duplicateClaimReferences3.length; j++) {
				let index = result1.findIndex((item) => {
					return item.CLAIM_REFERENCE === duplicateClaimReferences3[j];	
				});
				
				if (index !== -1) {
					result1.splice(index, 1);
				}
			}
			
			// Scenario 2: Cancellation Approved Status
			result3 = await tx.run(`
				SELECT
					"CLAIM_TABLE".*,
					"CANCEL_MASTER"."PARENT_CLAIM_REFERENCE" AS "CANCELLED_MASTER_CLAIM_REFERENCE",
					CASE 
						WHEN "STATUS_TABLE"."TOTAL_LEVEL"='3' 
						THEN "CLAIM_TABLE"."THIRD_LEVEL_APPROVED_ON"
						WHEN "STATUS_TABLE"."TOTAL_LEVEL"='2' 
						THEN "CLAIM_TABLE"."SECOND_LEVEL_APPROVED_ON"
						ELSE "CLAIM_TABLE"."FIRST_LEVEL_APPROVED_ON"
					END AS "EFFECTIVE_DATE"
				FROM "${table}" AS "CLAIM_TABLE"
				INNER JOIN "BENEFIT_CLAIM_CANCEL_MASTER" AS "CANCEL_MASTER"
				ON "CANCEL_MASTER"."CLAIM_REFERENCE" = "CLAIM_TABLE"."CLAIM_REFERENCE"
				INNER JOIN "BENEFIT_CLAIM_STATUS" AS "STATUS_TABLE"
				ON "CLAIM_TABLE"."CLAIM_REFERENCE"="STATUS_TABLE"."CLAIM_REFERENCE" AND "CLAIM_TABLE"."CLAIM_STATUS"='Cancellation Approved'
				WHERE ("STATUS_TABLE"."TOTAL_LEVEL"='1' AND "CLAIM_TABLE"."FIRST_LEVEL_APPROVED_ON" BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}') OR
					  ("STATUS_TABLE"."TOTAL_LEVEL"='2' AND "CLAIM_TABLE"."SECOND_LEVEL_APPROVED_ON" BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}') OR
					  ("STATUS_TABLE"."TOTAL_LEVEL"='3' AND "CLAIM_TABLE"."THIRD_LEVEL_APPROVED_ON" BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}')
			`);
			
			// Check for duplicate records
			let duplicateClaimReferences4 = [];
			for (let l = 0; l < result3.length; l++) {
				let repLogData = await tx.run(
					`SELECT "INTERNAL_CLAIM_REFERENCE", "CLAIM_STATUS" FROM "SF_REPLICATION_LOGS" WHERE ("INTERNAL_CLAIM_REFERENCE"='${result3[l].CLAIM_REFERENCE}' OR ("INTERNAL_CLAIM_REFERENCE"='${result3[l].CANCELLED_MASTER_CLAIM_REFERENCE}' AND "CLAIM_STATUS"='Approved')) AND "REP_STATUS"='Success'`
				);
				if (repLogData.length === 0) {
					let cancelledClaim = JSON.parse(JSON.stringify(result3[l]));
					cancelledClaim.CLAIM_REFERENCE = cancelledClaim.CANCELLED_MASTER_CLAIM_REFERENCE;
					cancelledClaim.CLAIM_STATUS = 'Cancelled';
					additionalPositiveValueCancellationClaims.push(cancelledClaim);
				} else {
					let existingDuplicateClaim = repLogData.find((item) => {
						return item.CLAIM_STATUS === 'Cancellation Approved';	
					});
					if (existingDuplicateClaim) {
						duplicateClaimReferences4.push(result3[l].CLAIM_REFERENCE);
					}
				}
			}
			// Remove duplicate rows from Cancellation Approved result
			for (let k = 0; k < duplicateClaimReferences4.length; k++) {
				let index = result3.findIndex((item) => {
					return item.CLAIM_REFERENCE === duplicateClaimReferences4[k];	
				});
				
				if (index !== -1) {
					result3.splice(index, 1);
				}
			}
		}
		
		let combinedResults = [];
		combinedResults = combinedResults.concat(result1);
		
		for (let i = 0; i < result3.length; i++) {
			result3[i].CLAIM_AMOUNT = parseFloat(-result3[i].CLAIM_AMOUNT).toFixed(2);
			if (hasLineItems && result3[i].MASTER_CLAIM_AMOUNT && parseFloat(result3[i].MASTER_CLAIM_AMOUNT) > 0) {
				result3[i].MASTER_CLAIM_AMOUNT = parseFloat(-result3[i].MASTER_CLAIM_AMOUNT).toFixed(2);
			}
			if (!hasLineItems && table === "BENEFIT_MEDICAL_CLAIM" && 
				result3[i].AMOUNT_PAID_VIA_PAYROLL && parseFloat(result3[i].AMOUNT_PAID_VIA_PAYROLL) > 0) {
				result3[i].AMOUNT_PAID_VIA_PAYROLL = parseFloat(-result3[i].AMOUNT_PAID_VIA_PAYROLL).toFixed(2);
			}
			if (!hasLineItems && table === 'BENEFIT_OVERTIME_CLAIM' && parseFloat(result3[i].WORK_HOURS_ACTUAL) > 0) {
				result3[i].WORK_HOURS_ACTUAL = parseFloat(-result3[i].WORK_HOURS_ACTUAL).toFixed(2);
			}
			if (result3[i].CLAIM_UNIT && parseFloat(result3[i].CLAIM_UNIT) > 0) {
				result3[i].CLAIM_UNIT = parseFloat(-result3[i].CLAIM_UNIT).toFixed(2);
			}
			combinedResults.push(result3[i]);
		}
		combinedResults = combinedResults.concat(additionalPositiveValueCancellationClaims);
		return combinedResults;
	}
	
	function validateAndSetReplicationDates(req) {
		let startDate, endDate;
		console.log("Start Date", req.data.StartDate);
		console.log("End Date", req.data.EndDate);
		if (req.data.StartDate !== '' || req.data.EndDate !== '') {
			let reqStartDate = new Date(req.data.StartDate);
		    let reqEndDate = new Date(req.data.EndDate);
		
			if (req.data.StartDate !== '' && !isValidDate(reqStartDate)) {
				return req.reject({
					code: '400',
					message: `Invalid Parameter StartDate "${req.data.StartDate}" .`
				});
			}
			
			if (req.data.EndDate !== '' && !isValidDate(reqEndDate)) {
				return req.reject({
					code: '400',
					message: `Invalid Parameter EndDate "${req.data.EndDate}" .`
				});
			}
			
			if (reqStartDate > reqEndDate) {
				return req.reject({
					code: '400',
					message: `Start date "${req.data.StartDate}" should be less than end date "${req.data.EndDate}".`
				});
			}
			
			startDate = dateFormat(reqStartDate);
			endDate = dateFormat(reqEndDate);
		} else {
			endDate = new Date();
			startDate = dateFormat(new Date(new Date().setDate(endDate.getDate() - 1)));
			endDate = dateFormat(endDate);
		}
		
		return {
			startDate: startDate,
			endDate: endDate
		};
	}
	
	function isValidDate(d) {
	  return d instanceof Date && !isNaN(d);
	}
	
	srv.on('SAPReplicationClaim', async(req) => {
		let result1, result2, result3, result4, finalResult = [],
			logs = [];
		const tableWithoutLineItem = [
				'BENEFIT_OVERTIME_CLAIM'
			],
			tableWithLineItem = [{
				masterTable: 'BENEFIT_WRC_MASTER_CLAIM',
				lineItemTable: 'BENEFIT_WRC_LINEITEM_CLAIM'
			}, {
				masterTable: 'BENEFIT_WRC_HR_MASTER_CLAIM',
				lineItemTable: 'BENEFIT_WRC_HR_LINEITEM_CLAIM'
			}];
		try {
			const tx = cds.transaction(req);
			let dateRange = validateAndSetReplicationDates(req);
			
			for (let i = 0; i < tableWithoutLineItem.length; i++) {
				result1 = await getReplicationClaims(req, 'SAP', tableWithoutLineItem[i], dateRange, false);
				if (result1.length > 0) {
					for (let j = 0; j < result1.length; j++) {
						// let repLogData = await tx.run(
						// 	`SELECT "REP_STATUS" FROM "SF_REPLICATION_LOGS" WHERE "INTERNAL_CLAIM_REFERENCE"='${result1[j].CLAIM_REFERENCE}' AND "REP_STATUS"='Success'`
						// );
						// if (repLogData.length === 0) {
						result2 = await tx.run(
							`SELECT "PAY_COMPONENT", "REF_REPLICATION_DATE_TYPE" FROM "BENEFIT_BENEFIT_CLAIM_ADMIN" WHERE "CLAIM_CODE"='${result1[j].CLAIM_CODE}' AND "PAYMENT_MODE"='SAP Replication'`
						);
						if (result2.length === 0) {
							logs.push({
								Rep_Log_ID: generateRandomID(),
								Rep_Timestamp: new Date(),
								Internal_Claim_Reference: result1[j].CLAIM_REFERENCE,
								Claim_Status: result1[j].CLAIM_STATUS,
								Rep_Type: 'SAP Replication',
								Rep_Status: 'Error',
								Message: `Claim admin configuration not found for this "${result1[j].CLAIM_CODE}"`,
								Employee_ID: result1[j].EMPLOYEE_ID,
								Unit: (tableWithoutLineItem[i] === 'BENEFIT_OVERTIME_CLAIM') ? result1[j].WORK_HOURS_ACTUAL : result1[j].CLAIM_UNIT
							});
						} else {
							if (result2[0].REF_REPLICATION_DATE_TYPE) {
								var formattedDate, effectiveDate, effectiveFormattedDate;
								if (result2[0].REF_REPLICATION_DATE_TYPE === "Claim Date") {
									effectiveDate = result1[j].CLAIM_DATE;
									effectiveFormattedDate = dateFormatForSAPClaimReference(result1[j].CLAIM_DATE);
								} else if (result2[0].REF_REPLICATION_DATE_TYPE === "Receipt Date") {
									effectiveDate = result1[j].RECEIPT_DATE;
									effectiveFormattedDate = dateFormatForSAPClaimReference(result1[j].RECEIPT_DATE);
								} else if (result2[0].REF_REPLICATION_DATE_TYPE === "Final Approved Date") {
									effectiveDate = result1[j].EFFECTIVE_DATE;
									effectiveFormattedDate = dateFormatForSAPClaimReference(result1[j].EFFECTIVE_DATE);
								}  else if (result2[0].REF_REPLICATION_DATE_TYPE === "N/A") {
									continue;
								} else {
									logs.push({
										Rep_Log_ID: generateRandomID(),
										Rep_Timestamp: new Date(),
										Internal_Claim_Reference: result1[j].CLAIM_REFERENCE,
										Claim_Status: result1[j].CLAIM_STATUS,
										Rep_Type: 'SAP Replication',
										Rep_Status: 'Error',
										Message: `Claim admin configuration "REF_REPLICATION_DATE_TYPE" is not maintained correctly for this "${result1[j].CLAIM_CODE}"`,
										Employee_ID: result1[j].EMPLOYEE_ID,
										Pay_Component: result2[0].PAY_COMPONENT,
										Unit: (tableWithoutLineItem[i] === 'BENEFIT_OVERTIME_CLAIM') ? result1[j].WORK_HOURS_ACTUAL : result1[j].CLAIM_UNIT
									});
									continue;
								}
								if (!effectiveDate) {
									logs.push({
										Rep_Log_ID: generateRandomID(),
										Rep_Timestamp: new Date(),
										Internal_Claim_Reference: result1[j].CLAIM_REFERENCE,
										Claim_Status: result1[j].CLAIM_STATUS,
										Rep_Type: 'SAP Replication',
										Rep_Status: 'Error',
										Message: `"EFFECTIVE_DATE"="${effectiveDate}", "REF_REPLICATION_DATE_TYPE"="${result2[0].REF_REPLICATION_DATE_TYPE}" for this "${result1[j].CLAIM_CODE}". Please check the "REF_REPLICATION_DATE_TYPE" is correctly configured or respective dates in the claim`,
										Employee_ID: result1[j].EMPLOYEE_ID,
										Pay_Component: result2[0].PAY_COMPONENT,
										Unit: (tableWithoutLineItem[i] === 'BENEFIT_OVERTIME_CLAIM') ? result1[j].WORK_HOURS_ACTUAL : result1[j].CLAIM_UNIT
									});
									continue;
								}
								let claimRefNum = uid();
								finalResult.push({
									EMPLOYEE_ID: result1[j].EMPLOYEE_ID,
									PAY_COMPONENT: result2[0].PAY_COMPONENT,
									EFFECTIVE_DATE: effectiveFormattedDate,
									UNIT: (tableWithoutLineItem[i] === 'BENEFIT_OVERTIME_CLAIM') ? result1[j].WORK_HOURS_ACTUAL : result1[j].CLAIM_UNIT,
									CLAIM_REF_NUMBER: claimRefNum
								});
								let repLogTimeStamp = new Date();
								await updatePostingEstimatedDate(req, repLogTimeStamp, result1[j].CLAIM_REFERENCE, 'SAP Replication');
								logs.push({
									Rep_Log_ID: generateRandomID(),
									Rep_Timestamp: repLogTimeStamp,
									Internal_Claim_Reference: result1[j].CLAIM_REFERENCE,
									Claim_Status: result1[j].CLAIM_STATUS,
									Rep_Type: 'SAP Replication',
									Rep_Status: 'Success',
									Message: `Successfully Replicated`,
									Employee_ID: result1[j].EMPLOYEE_ID,
									Claim_Ref_Number: claimRefNum,
									Effective_Date: effectiveDate,
									Pay_Component: result2[0].PAY_COMPONENT,
									Unit: (tableWithoutLineItem[i] === 'BENEFIT_OVERTIME_CLAIM') ? result1[j].WORK_HOURS_ACTUAL : result1[j].CLAIM_UNIT
								});
							} else {
								logs.push({
									Rep_Log_ID: generateRandomID(),
									Rep_Timestamp: new Date(),
									Internal_Claim_Reference: result1[j].CLAIM_REFERENCE,
									Claim_Status: result1[j].CLAIM_STATUS,
									Rep_Type: 'SAP Replication',
									Rep_Status: 'Error',
									Message: `Claim admin configuration "REF_REPLICATION_DATE_TYPE" not found for this "${result1[j].CLAIM_CODE}"`,
									Employee_ID: result1[j].EMPLOYEE_ID,
									Pay_Component: result2[0].PAY_COMPONENT,
									Unit: (tableWithoutLineItem[i] === 'BENEFIT_OVERTIME_CLAIM') ? result1[j].WORK_HOURS_ACTUAL : result1[j].CLAIM_UNIT
								});
							}
						}	
						// }
					}
				}
			}
			for (let k = 0; k < tableWithLineItem.length; k++) {
				result3 = await getReplicationClaims(req, 'SAP', tableWithLineItem[k], dateRange, true);
				if (result3.length > 0) {
					for (let l = 0; l < result3.length; l++) {
						// let repLogData = await tx.run(
						// 	`SELECT "REP_STATUS" FROM "SF_REPLICATION_LOGS" WHERE "INTERNAL_CLAIM_REFERENCE"='${result3[l].CLAIM_REFERENCE}' AND "REP_STATUS"='Success'`
						// );
						// if (repLogData.length === 0) {
						result4 = await tx.run(
							`SELECT "PAY_COMPONENT", "REF_REPLICATION_DATE_TYPE" FROM "BENEFIT_BENEFIT_CLAIM_ADMIN" WHERE "CLAIM_CODE"='${result3[l].CLAIM_CODE}' AND "PAYMENT_MODE"='SAP Replication'`
						);
						if (result4.length === 0) {
							logs.push({
								Rep_Log_ID: generateRandomID(),
								Rep_Timestamp: new Date(),
								Internal_Claim_Reference: result3[l].CLAIM_REFERENCE,
								Claim_Status: result3[l].CLAIM_STATUS,
								Rep_Type: 'SAP Replication',
								Rep_Status: 'Error',
								Message: `Claim admin configuration not found for this "${result3[l].CLAIM_CODE}"`,
								Employee_ID: result3[l].EMPLOYEE_ID,
								Unit: result3[l].CLAIM_UNIT
							});
						} else {
							if (result4[0].REF_REPLICATION_DATE_TYPE) {
								var formattedDate, effectiveDate, effectiveFormattedDate;
								if (result4[0].REF_REPLICATION_DATE_TYPE === "Claim Date") {
									effectiveDate = result3[l].CLAIM_DATE;
									effectiveFormattedDate = dateFormatForSAPClaimReference(result3[l].CLAIM_DATE);
								} else if (result4[0].REF_REPLICATION_DATE_TYPE === "Receipt Date") {
									effectiveDate = result3[l].RECEIPT_DATE;
									effectiveFormattedDate = dateFormatForSAPClaimReference(result3[l].RECEIPT_DATE);
								} else if (result4[0].REF_REPLICATION_DATE_TYPE === "Final Approved Date") {
									effectiveDate = result3[l].EFFECTIVE_DATE;
									effectiveFormattedDate = dateFormatForSAPClaimReference(result3[l].EFFECTIVE_DATE);
								} else if (result4[0].REF_REPLICATION_DATE_TYPE === "N/A") {
									continue;
								} else {
									logs.push({
										Rep_Log_ID: generateRandomID(),
										Rep_Timestamp: new Date(),
										Internal_Claim_Reference: result3[l].CLAIM_REFERENCE,
										Claim_Status: result3[l].CLAIM_STATUS,
										Rep_Type: 'SAP Replication',
										Rep_Status: 'Error',
										Message: `Claim admin configuration "REF_REPLICATION_DATE_TYPE" is not maintained correctly for this "${result3[l].CLAIM_CODE}"`,
										Employee_ID: result3[l].EMPLOYEE_ID,
										Pay_Component: result4[0].PAY_COMPONENT,
										Unit: result3[l].CLAIM_UNIT
									});
									continue;
								}
								if (!effectiveDate) {
									logs.push({
										Rep_Log_ID: generateRandomID(),
										Rep_Timestamp: new Date(),
										Internal_Claim_Reference: result3[l].CLAIM_REFERENCE,
										Claim_Status: result3[l].CLAIM_STATUS,
										Rep_Type: 'SAP Replication',
										Rep_Status: 'Error',
										Message: `"EFFECTIVE_DATE"="${effectiveDate}", "REF_REPLICATION_DATE_TYPE"="${result4[0].REF_REPLICATION_DATE_TYPE}" for this "${result3[l].CLAIM_CODE}". Please check the "REF_REPLICATION_DATE_TYPE" is correctly configured or respective dates in the claim`,
										Employee_ID: result3[l].EMPLOYEE_ID,
										Pay_Component: result4[0].PAY_COMPONENT,
										Unit: result3[l].CLAIM_UNIT
									});
									continue;
								}
								let claimRefNum = uid();
								finalResult.push({
									EMPLOYEE_ID: result3[l].EMPLOYEE_ID,
									PAY_COMPONENT: result4[0].PAY_COMPONENT,
									EFFECTIVE_DATE: effectiveFormattedDate,
									UNIT: result3[l].CLAIM_UNIT,
									CLAIM_REF_NUMBER: claimRefNum
								});
								let repLogTimeStamp = new Date();
								await updatePostingEstimatedDate(req, repLogTimeStamp, result3[l].PARENT_CLAIM_REFERENCE, 'SAP Replication');
								logs.push({
									Rep_Log_ID: generateRandomID(),
									Rep_Timestamp: repLogTimeStamp,
									Internal_Claim_Reference: result3[l].CLAIM_REFERENCE,
									Claim_Status: result3[l].CLAIM_STATUS,
									Rep_Type: 'SAP Replication',
									Rep_Status: 'Success',
									Message: `Successfully Replicated`,
									Employee_ID: result3[l].EMPLOYEE_ID,
									Claim_Ref_Number: claimRefNum,
									Effective_Date: effectiveDate,
									Pay_Component: result4[0].PAY_COMPONENT,
									Unit: result3[l].CLAIM_UNIT
								});
							} else {
								logs.push({
									Rep_Log_ID: generateRandomID(),
									Rep_Timestamp: new Date(),
									Internal_Claim_Reference: result3[l].CLAIM_REFERENCE,
									Claim_Status: result3[l].CLAIM_STATUS,
									Rep_Type: 'SF Replication',
									Rep_Status: 'Error',
									Message: `Claim admin configuration "REF_REPLICATION_DATE_TYPE" not found for this "${result3[l].CLAIM_CODE}"`,
									Employee_ID: result3[l].EMPLOYEE_ID,
									Pay_Component: result4[0].PAY_COMPONENT,
									Unit: result3[l].CLAIM_UNIT
								});
							}
						}	
						// }
					}
				}
			}
			if (logs.length > 0) {
				logs.forEach((log) => {
					log.Unit = parseFloat(log.Unit);
				})
				await tx.run(INSERT.into(Replication_Logs).entries(logs));
			}
			return finalResult;
		} catch(error) {
			console.log('logs:', logs);
			console.log('Error', error);
			req.reject(error);
		}
	});
	
	srv.on('SFReplicationMedicalClaim', async(req) => {
		let result1, result2, result3, result4, finalResult = [], logs = [];
			
		const empList = []; let sequence, empExist;
		const tx = cds.transaction(req);
		let dateRange = validateAndSetReplicationDates(req);
		
		let employeeList = await tx.run(
			`SELECT
				"USERID"
			FROM "SF_EMPEMPLOYMENT"
			WHERE "ENDDATE" BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}'`
		);
		
		if (employeeList.length === 0) {
			return finalResult;
		}
		
		for (let h = 0; h < employeeList.length; h++) {
			result1 = await tx.run(
				`SELECT "EMP_ELIGIBILTY"."CLAIM_CODE",
					    "EMP_ELIGIBILTY"."SEQUENCE",
					    "EMP_ELIGIBILTY"."EFFECTIVE_DATE",
					    "EMP_ELIGIBILTY"."END_DATE",
					    "EMP_ELIGIBILTY"."ENTITLEMENT",
					    "EMP_ELIGIBILTY"."CATEGORY_CODE",
					    "CLAIM_ADMIN"."COMPANY",
					    "CLAIM_ADMIN"."PAY_COMPONENT",
					    "CLAIM_ADMIN"."REF_REPLICATION_DATE_TYPE"
				 FROM "SF_EMPLOYEEELIGIBILITY"('${employeeList[h].USERID}') AS "EMP_ELIGIBILTY"
				 FULL OUTER JOIN "BENEFIT_BENEFIT_CLAIM_ADMIN" AS "CLAIM_ADMIN"
				 ON "CLAIM_ADMIN"."CLAIM_CODE" = "EMP_ELIGIBILTY"."CLAIM_CODE"
				 WHERE "EMP_ELIGIBILTY"."CATEGORY_CODE"='MC' AND "CLAIM_ADMIN"."PAYMENT_MODE"='SF Replication'`
			);
			
			result3 = await tx.run(
				`SELECT 
					"REF_NUM",
					"EMPLOYEE_ID",
				    "PAY_COMPONENT",
				    "EFFECTIVE_DATE",
				    "RING_FENCED_CLAIM_AMOUNT"
				 FROM "BENEFIT_MEDISAVE_CREDIT"
				 WHERE "EMPLOYEE_ID"='${employeeList[h].USERID}'`
			);
			
			if (result1.length === 0 && result3.length === 0) {
				return finalResult;
			}
			
			for (let k = 0; k < result3.length; k++) {
				let repLogData = await tx.run(
					`SELECT "REP_STATUS" FROM "SF_REPLICATION_LOGS" WHERE "INTERNAL_CLAIM_REFERENCE"='${result3[k].REF_NUM}' AND "REP_STATUS"='Success'`
				);
				if (repLogData.length === 0) {
					empExist = empList.find(item => {
						return item.employeeId === employeeList[h].USERID;
					});
					
					if (empExist) {
						empExist.sequence += 1;
						sequence = empExist.sequence;
					} else {
						empList.push({
							employeeId: employeeList[h].USERID,
							sequence: 1
						});
						sequence = 1;
					}
					
					let lastSequence = await tx.run(
						`SELECT 
							MAX("SEQUENCENUMBER") AS "MAX_SEQUENCE"
						 FROM "SF_EMPPAYCOMPNONRECURRING" 
						 WHERE "USERID"='${employeeList[h].USERID}'`
					);
					
					if (lastSequence.length > 0 && lastSequence[0] && lastSequence[0].MAX_SEQUENCE) {
						sequence = sequence + parseInt(lastSequence[0].MAX_SEQUENCE, 10);
					}
					
					let claimRefNum = uid();
					finalResult.push({
						EMPLOYEE_ID: employeeList[h].USERID,
						// CLAIM_REF_NUMBER: dateFormatForClaimReference(result3[k].EFFECTIVE_DATE) + pad(sequence),
						CLAIM_REF_NUMBER: claimRefNum,
						PAY_COMPONENT: result3[k].PAY_COMPONENT,
						EFFECTIVE_DATE: result3[k].EFFECTIVE_DATE,
						CLAIM_AMOUNT: result3[k].RING_FENCED_CLAIM_AMOUNT,
						SEQUENCE: sequence
					});
					
					logs.push({
						Rep_Log_ID: generateRandomID(),
						Rep_Timestamp: new Date(),
						Internal_Claim_Reference: result3[k].REF_NUM,
						Rep_Type: 'SF Replication',
						Rep_Status: 'Success',
						Message: `Successfully Replicated`,
						Employee_ID: employeeList[h].USERID,
						// Claim_Ref_Number: dateFormatForClaimReference(result3[k].EFFECTIVE_DATE) + pad(sequence),
						Claim_Ref_Number: claimRefNum,
						Effective_Date: result3[k].EFFECTIVE_DATE,
						Pay_Component: result3[k].PAY_COMPONENT,
						Claim_Amount: result3[k].RING_FENCED_CLAIM_AMOUNT,
						Sequence: sequence
					});
				}
			}
			
			const startDate = dateFormat(new Date(new Date().getFullYear(), 0, 1)),
				  endDate = dateFormat(new Date(new Date().getFullYear(), 11, 31));
			for (let i = 0; i < result1.length; i++) {
				result2 = await tx.run(
					`SELECT 
						"CLAIM_TABLE".*,
						CASE 
							WHEN "STATUS_TABLE"."TOTAL_LEVEL"='3' 
							THEN "CLAIM_TABLE"."THIRD_LEVEL_APPROVED_ON"
							WHEN "STATUS_TABLE"."TOTAL_LEVEL"='2' 
							THEN "CLAIM_TABLE"."SECOND_LEVEL_APPROVED_ON"
							ELSE "CLAIM_TABLE"."FIRST_LEVEL_APPROVED_ON"
						END AS "EFFECTIVE_DATE"
					FROM "BENEFIT_MEDICAL_CLAIM" AS "CLAIM_TABLE"
					INNER JOIN "BENEFIT_CLAIM_STATUS" AS "STATUS_TABLE"
					ON "CLAIM_TABLE"."CLAIM_REFERENCE"="STATUS_TABLE"."CLAIM_REFERENCE"
					WHERE "CLAIM_TABLE"."EMPLOYEE_ID"='${employeeList[h].USERID}' AND
					   "CLAIM_TABLE"."CLAIM_CODE"='${result1[i].CLAIM_CODE}' AND
					   "CLAIM_TABLE"."CLAIM_STATUS"='Approved' AND
					   ("STATUS_TABLE"."TOTAL_LEVEL"='1' AND "CLAIM_TABLE"."FIRST_LEVEL_APPROVED_ON" BETWEEN '${startDate}' AND '${endDate}') OR
					   ("STATUS_TABLE"."TOTAL_LEVEL"='2' AND "CLAIM_TABLE"."SECOND_LEVEL_APPROVED_ON" BETWEEN '${startDate}' AND '${endDate}') OR
					   ("STATUS_TABLE"."TOTAL_LEVEL"='3' AND "CLAIM_TABLE"."THIRD_LEVEL_APPROVED_ON" BETWEEN '${startDate}' AND '${endDate}')`
				);
				if (result2.length > 0) {
					let totalClaimAmount = 0;
					for (let j = 0; j < result2.length; j++) {
						let repLogData = await tx.run(
							`SELECT "REP_STATUS" FROM "SF_REPLICATION_LOGS" WHERE "INTERNAL_CLAIM_REFERENCE"='${'M_' + result2[j].CLAIM_REFERENCE}' AND "REP_STATUS"='Success'`
						);
						if (repLogData.length === 0) {
							/*if (result1[i].REF_REPLICATION_DATE_TYPE) {
								var formattedDate, effectiveDate;
								if (result1[i].REF_REPLICATION_DATE_TYPE === "Claim Date") {
									formattedDate = dateFormatForClaimReference(result2[j].CLAIM_DATE);
									effectiveDate = result2[j].CLAIM_DATE;
								} else if (result1[i].REF_REPLICATION_DATE_TYPE === "Receipt Date") {
									formattedDate = dateFormatForClaimReference(result2[j].RECEIPT_DATE);
									effectiveDate = result2[j].RECEIPT_DATE;
								} else if (result1[i].REF_REPLICATION_DATE_TYPE === "Final Approved Date") {
									formattedDate = dateFormatForClaimReference(result2[j].EFFECTIVE_DATE);
									effectiveDate = result2[j].EFFECTIVE_DATE;
								} else if (result1[i].REF_REPLICATION_DATE_TYPE === "N/A") {
									continue;
								} else {
									logs.push({
										Rep_Log_ID: generateRandomID(),
										Rep_Timestamp: new Date(),
										Internal_Claim_Reference: result2[j].CLAIM_REFERENCE,
										Rep_Type: 'SF Replication',
										Rep_Status: 'Error',
										Message: `Claim admin configuration "REF_REPLICATION_DATE_TYPE" is not maintained correctly for this "${result2[j].CLAIM_CODE}"`,
										Employee_ID: employeeList[h].USERID,
										Claim_Ref_Number: result2[j].CLAIM_REFERENCE,
										Pay_Component: result1[i].PAY_COMPONENT,
										Claim_Amount: result2[j].AMOUNT_PAID_VIA_PAYROLL
									});
									continue;
								}
							}*/
							/*let columnName;
							if (result1[i].REF_REPLICATION_DATE_TYPE === "Claim Date") {
								columnName = "CLAIM_DATE";
							} else if (result1[i].REF_REPLICATION_DATE_TYPE === "Receipt Date") {
								columnName = "RECEIPT_DATE";
							} else if (result1[i].REF_REPLICATION_DATE_TYPE === "Final Approved Date") {
								columnName = "FINAL_APPROVER_ON";
							} else {
								logs.push({
									Rep_Log_ID: generateRandomID(),
									Rep_Timestamp: new Date(),
									Internal_Claim_Reference: result2[j].CLAIM_REFERENCE,
									Rep_Type: 'SF Replication',
									Rep_Status: 'Error',
									Message: `Claim admin configuration "REF_REPLICATION_DATE_TYPE" is not maintained correctly for this "${result2[j].CLAIM_CODE}"`,
									Employee_ID: requestData.UserID,
									Claim_Ref_Number: result2[j].CLAIM_REFERENCE,
									Pay_Component: result1[i].PAY_COMPONENT,
									Claim_Amount: result2[j].AMOUNT_PAID_VIA_PAYROLL
								});
								continue;
							}*/
							if (result2[j].AMOUNT_PAID_VIA_PAYROLL) {
								totalClaimAmount += (result2[j].AMOUNT_PAID_VIA_PAYROLL && parseFloat(result2[j].AMOUNT_PAID_VIA_PAYROLL) !== 0) ? parseFloat(result2[j].AMOUNT_PAID_VIA_PAYROLL) : parseFloat(result2[j].CLAIM_AMOUNT);
							}
							let effectiveDate = dateFormat(new Date());
							empExist = empList.find(item => {
								return item.employeeId === employeeList[h].USERID;
							});
							
							if (empExist) {
								empExist.sequence += 1;
								sequence = empExist.sequence;
							} else {
								empList.push({
									employeeId: employeeList[h].USERID,
									sequence: 1
								});
								sequence = 1;
							}
							
							let lastSequence = await tx.run(
								`SELECT 
									MAX("SEQUENCENUMBER") AS "MAX_SEQUENCE"
								 FROM "SF_EMPPAYCOMPNONRECURRING" 
								 WHERE "USERID"='${employeeList[h].USERID}'`
							);
							/*dateExist = effectiveDates.find(item => {
								return item.date === effectiveDate && item.employeeId === employeeList[h].USERID;
							});
							
							if (dateExist) {
								dateExist.sequence += 1;
								sequence = dateExist.sequence;
							} else {
								effectiveDates.push({
									date: effectiveDate,
									employeeId: employeeList[h].USERID,
									sequence: 1
								});
								sequence = 1;
							}
							
							let lastSequence = await tx.run(
								`SELECT 
									MAX("SEQUENCE") AS "MAX_SEQUENCE"
								 FROM "SF_REPLICATION_LOGS" 
								 WHERE "EMPLOYEE_ID"='${employeeList[h].USERID}' AND
									"REP_STATUS"='Success' AND
									"EFFECTIVE_DATE"='${effectiveDate}'`
							);*/
								
							if (lastSequence.length > 0 && lastSequence[0] && lastSequence[0].MAX_SEQUENCE) {
								sequence = sequence + parseInt(lastSequence[0].MAX_SEQUENCE, 10);
							}
							
							let claimRefNum = uid();
							logs.push({
								Rep_Log_ID: generateRandomID(),
								Rep_Timestamp: new Date(),
								Internal_Claim_Reference: 'M_' + result2[j].CLAIM_REFERENCE,
								Rep_Type: 'SF Replication',
								Rep_Status: 'Success',
								Message: `Successfully Replicated`,
								Employee_ID: employeeList[h].USERID,
								// Claim_Ref_Number: dateFormatForClaimReference(new Date()) + pad(sequence),
								Claim_Ref_Number: claimRefNum,
								Effective_Date: effectiveDate,
								Pay_Component: result1[i].PAY_COMPONENT,
								Claim_Amount: result2[j].AMOUNT_PAID_VIA_PAYROLL,
								Sequence: sequence
							});
						}
					}
					if (result1[i].ENTITLEMENT) {
						let prorationPayload = {
							UserID: employeeList[h].USERID,
							Entitlement: result1[i].ENTITLEMENT,
						    EmpType: "",
						    WorkingPeriod: "",
						    ClaimDetail: {
						        Date: new Date(),
						        Company: result1[i].COMPANY,
						        Claim_Code: result1[i].CLAIM_CODE,
						        Claim_Category: result1[i].CATEGORY_CODE
						    }
						};
						let prorationResult = await prorationRule(prorationPayload, req, true, result2[0]);
						logs = logs.concat(prorationResult.logs);
						let balance = parseFloat(prorationResult.value) - totalClaimAmount;
						if (balance < 0) {
							let effectiveDate = dateFormat(new Date());
							empExist = empList.find(item => {
								return item.employeeId === employeeList[h].USERID;
							});
							
							if (empExist) {
								empExist.sequence += 1;
								sequence = empExist.sequence;
							} else {
								empList.push({
									employeeId: employeeList[h].USERID,
									sequence: 1
								});
								sequence = 1;
							}
							
							let lastSequence = await tx.run(
								`SELECT 
									MAX("SEQUENCENUMBER") AS "MAX_SEQUENCE"
								 FROM "SF_EMPPAYCOMPNONRECURRING" 
								 WHERE "USERID"='${employeeList[h].USERID}'`
							);
								
							if (lastSequence.length > 0 && lastSequence[0] && lastSequence[0].MAX_SEQUENCE) {
								sequence = sequence + parseInt(lastSequence[0].MAX_SEQUENCE, 10);
							}
							
							let claimRefNum = uid();
							finalResult.push({
								EMPLOYEE_ID: employeeList[h].USERID,
								// CLAIM_REF_NUMBER: dateFormatForClaimReference(new Date()) + pad(sequence),
								CLAIM_REF_NUMBER: claimRefNum,
								PAY_COMPONENT: result1[i].PAY_COMPONENT,
								EFFECTIVE_DATE: effectiveDate,
								CLAIM_AMOUNT: balance,
								SEQUENCE: sequence
							});
							
							logs.push({
								Rep_Log_ID: generateRandomID(),
								Rep_Timestamp: new Date(),
								Internal_Claim_Reference: 'M_' + result2[0].CLAIM_REFERENCE,
								Rep_Type: 'SF Replication',
								Rep_Status: 'Success',
								Message: `Successfully Replicated`,
								Employee_ID: employeeList[h].USERID,
								// Claim_Ref_Number: dateFormatForClaimReference(new Date()) + pad(sequence),
								Claim_Ref_Number: claimRefNum,
								Effective_Date: effectiveDate,
								Pay_Component: result1[i].PAY_COMPONENT,
								Claim_Amount: balance,
								Sequence: sequence
							});
						}
					}
				}
			}
		}
		
		if (logs.length > 0) {
			await tx.run(INSERT.into(Replication_Logs).entries(logs));
		}
		return finalResult;
	});
	
	function generateRandomID() {
		return Math.floor(Math.random() * 9000000000) + 1000000000;
	}
	
	function dateFormatForClaimReference(oDate) {
		var dateObj = new Date(oDate);
		var date = dateObj.getDate();
		var month = dateObj.getMonth();
		var year = dateObj.getFullYear().toString();
		var formattedDate = year + "" + pad(month + 1) + "" + pad(date);
		return formattedDate;
	}
	
	function dateFormatDDMMYYY(oDate) {
		var dateObj = new Date(oDate);
		var date = dateObj.getDate();
		var month = dateObj.getMonth();
		var year = dateObj.getFullYear().toString();
		var formattedDate = pad(date) + "" + pad(month + 1) + "" + year;
		return formattedDate;
	}
	
	function dateFormatForSAPClaimReference(oDate) {
		var dateObj = new Date(oDate);
		var date = dateObj.getDate();
		var month = dateObj.getMonth();
		var year = dateObj.getFullYear();
		var formattedDate = pad(date) + "." + pad(month + 1) + "." + year;
		return formattedDate;
	}
	
	function convertTimeZone(dateValue, tz) {
		return new Date(new Date(dateValue).toLocaleString("en-US", {timeZone: tz}));
	}
	
	function dateTimeFormat(dateValue) {
		var sDate = new Date(dateValue).toISOString();
		var splittedDate = sDate.split("T");
		splittedDate[1] = splittedDate[1].split(".")[0];
		var sFormattedDate = splittedDate.join(" ");
		return sFormattedDate;
	}
	
	function dateFormat(pdate) {
		var ldate = new Date(pdate)
		var date = ldate.getDate();
		var month = ldate.getMonth();
		var year = ldate.getFullYear();
		var ddmmyyyy = year + "-" + pad(month + 1) + "-" + pad(date);
		return ddmmyyyy;
	}

	function pad(n) {
		return n < 10 ? '0' + n : n
	}
	
	srv.on('SFEMPJobCPIDelete', async(req) => {
			var id = req.data.userid;
			var tx = cds.transaction(req);
			var deletEmpJob = tx.run(DELETE.from(EmpJob).where({
				userId:id
			}))
			if(deletEmpJob!=0){
				return `The Deletion of record for User ${id} was Successful`
			}
			else{
				return req.reject(404, `The Deletion of record for User ${id} failed`);
			}
	})
}