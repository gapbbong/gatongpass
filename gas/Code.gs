/**
 * Google Apps Script - 가통패스 영구 불변 백엔드
 * 
 * 이 스크립트는 한 번 배포하면 수정이 필요 없도록 설계되었습니다.
 * 모든 비즈니스 로직은 프론트엔드에서 제어합니다.
 * 
 * 배포 방법:
 * 1. Google Sheets 생성
 * 2. 확장 프로그램 > Apps Script
 * 3. 이 코드 붙여넣기
 * 4. 배포 > 새 배포 > 웹 앱
 * 5. 액세스 권한: "모든 사용자"
 * 6. URL 복사하여 .env.local에 저장
 */

// ============================================
// 환경 설정
// ============================================

const CONFIG = {
  API_KEY: PropertiesService.getScriptProperties().getProperty('API_KEY') || 'gatong_api_key_2025',
  RATE_LIMIT_PER_MINUTE: 60,
  MAX_EDIT_PER_DAY: 5,
  ALLOWED_ORIGINS: [
    'https://gatong.creat1324.com',
    'http://localhost:3000'
  ]
};

// ============================================
// 메인 엔드포인트
// ============================================

function doPost(e) {
  try {
    // CORS 헤더
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    
    // 요청 파싱
    const data = JSON.parse(e.postData.contents);
    
    // 보안 검증
    if (!authenticate(data.apiKey, data.schoolToken)) {
      return createResponse(false, 'Unauthorized', null);
    }
    
    // Rate Limiting
    if (!checkRateLimit(e.parameter.userIp || 'unknown')) {
      return createResponse(false, 'Too many requests', null);
    }
    
    // 입력 살균
    const sanitized = sanitizeInput(data);
    
    // 액션 라우팅
    switch (sanitized.action) {
      case 'submit':
        return handleSubmit(sanitized);
      case 'update':
        return handleUpdate(sanitized);
      case 'delete':
        return handleDelete(sanitized);
      case 'create-sheet':
        return handleCreateSheet(sanitized);
      case 'generate-resubmit':
        return handleGenerateResubmit(sanitized);
      default:
        return createResponse(false, 'Invalid action', null);
    }
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return createResponse(false, error.toString(), null);
  }
}

function doGet(e) {
  try {
    const params = e.parameter;
    
    // 보안 검증
    if (!authenticate(params.apiKey, params.schoolToken)) {
      return createResponse(false, 'Unauthorized', null);
    }
    
    // 액션 라우팅
    switch (params.action) {
      case 'get-submissions':
        return handleGetSubmissions(params);
      case 'get-stats':
        return handleGetStats(params);
      case 'get-students':
        return handleGetStudents(params);
      case 'verify-resubmit':
        return handleVerifyResubmit(params);
      default:
        return createResponse(false, 'Invalid action', null);
    }
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return createResponse(false, error.toString(), null);
  }
}

// ============================================
// 보안 함수
// ============================================

function authenticate(apiKey, schoolToken) {
  // API 키 검증
  if (apiKey !== CONFIG.API_KEY) {
    return false;
  }
  
  // 학교 토큰 검증 (간단한 예시, 실제로는 더 복잡한 로직)
  // schoolToken = hash(schoolId + secretKey)
  if (!schoolToken || schoolToken.length < 10) {
    return false;
  }
  
  return true;
}

function checkRateLimit(ip) {
  const cache = CacheService.getScriptCache();
  const key = 'rate_' + ip;
  const count = parseInt(cache.get(key) || '0');
  
  if (count >= CONFIG.RATE_LIMIT_PER_MINUTE) {
    return false;
  }
  
  cache.put(key, (count + 1).toString(), 60); // 60초 TTL
  return true;
}

function sanitizeInput(data) {
  // 재귀적으로 모든 문자열 값 살균
  if (typeof data === 'string') {
    return data.replace(/[<>]/g, '').substring(0, 10000);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeInput(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const key in data) {
      sanitized[key] = sanitizeInput(data[key]);
    }
    return sanitized;
  }
  
  return data;
}

// ============================================
// CRUD 핸들러
// ============================================

function handleSubmit(data) {
  try {
    const sheet = getOrCreateSheet(data.sheetId, data.spreadsheetId);
    
    // 헤더가 없으면 생성
    if (sheet.getLastRow() === 0) {
      const headers = data.headers || [
        '제출시간', '학년', '반', '번호', '이름', '연락처',
        ...data.formFields || [],
        '서명URL', 'IP', '디바이스', '수정횟수'
      ];
      sheet.appendRow(headers);
    }
    
    // 데이터 추가
    const row = [
      new Date(),
      ...data.values,
      0 // 초기 수정횟수
    ];
    
    sheet.appendRow(row);
    const submissionId = sheet.getLastRow();
    
    // 감사 로그
    logAudit('submit', data.studentInfo, {
      sheetId: data.sheetId,
      submissionId: submissionId
    });
    
    return createResponse(true, 'Submission successful', {
      submissionId: submissionId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return createResponse(false, error.toString(), null);
  }
}

function handleUpdate(data) {
  try {
    const sheet = getSheet(data.sheetId, data.spreadsheetId);
    if (!sheet) {
      return createResponse(false, 'Sheet not found', null);
    }
    
    const row = parseInt(data.submissionId);
    if (row < 2 || row > sheet.getLastRow()) {
      return createResponse(false, 'Invalid submission ID', null);
    }
    
    // 수정 횟수 확인
    const editCountCol = sheet.getLastColumn();
    const editCount = sheet.getRange(row, editCountCol).getValue();
    
    if (editCount >= CONFIG.MAX_EDIT_PER_DAY) {
      return createResponse(false, 'Edit limit exceeded', null);
    }
    
    // 기존 데이터 백업 (수정 이력)
    const oldData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    logEditHistory(data.sheetId, row, oldData, data.values, data.reason, data.editor);
    
    // 데이터 업데이트
    for (let i = 0; i < data.values.length; i++) {
      sheet.getRange(row, i + 2).setValue(data.values[i]); // +2 because col 1 is timestamp
    }
    
    // 수정 횟수 증가
    sheet.getRange(row, editCountCol).setValue(editCount + 1);
    
    // 감사 로그
    logAudit('update', data.editor, {
      sheetId: data.sheetId,
      submissionId: row,
      reason: data.reason
    });
    
    return createResponse(true, 'Update successful', {
      submissionId: row,
      editCount: editCount + 1
    });
  } catch (error) {
    return createResponse(false, error.toString(), null);
  }
}

function handleDelete(data) {
  try {
    const sheet = getSheet(data.sheetId, data.spreadsheetId);
    if (!sheet) {
      return createResponse(false, 'Sheet not found', null);
    }
    
    const row = parseInt(data.submissionId);
    
    // Soft delete: 삭제 플래그 추가
    const lastCol = sheet.getLastColumn() + 1;
    sheet.getRange(row, lastCol).setValue('DELETED_' + new Date().toISOString());
    
    // 감사 로그
    logAudit('delete', data.editor, {
      sheetId: data.sheetId,
      submissionId: row
    });
    
    return createResponse(true, 'Delete successful', null);
  } catch (error) {
    return createResponse(false, error.toString(), null);
  }
}

function handleCreateSheet(data) {
  try {
    const ss = data.spreadsheetId ? SpreadsheetApp.openById(data.spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = data.sheetId;
    
    // 시트 생성
    const sheet = ss.insertSheet(sheetName);
    
    // 헤더 설정
    const headers = data.headers || [
      '제출시간', '학년', '반', '번호', '이름', '연락처',
      '응답1', '응답2', '서명URL', 'IP', '디바이스', '수정횟수'
    ];
    sheet.appendRow(headers);
    
    // 헤더 스타일링
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4F46E5');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    
    // 조건부 서식 (제출 완료 = 초록색)
    // 이 부분은 수동으로 설정하거나 추가 스크립트 필요
    
    return createResponse(true, 'Sheet created', {
      sheetId: sheetName,
      sheetUrl: ss.getUrl() + '#gid=' + sheet.getSheetId()
    });
  } catch (error) {
    return createResponse(false, error.toString(), null);
  }
}

function handleGenerateResubmit(data) {
  try {
    // 재제출 토큰 생성 (간단한 예시)
    const token = Utilities.base64Encode(
      data.sheetId + '|' + data.submissionId + '|' + new Date().getTime()
    );
    
    // 토큰 저장 (24시간 유효)
    const cache = CacheService.getScriptCache();
    cache.put('resubmit_' + token, JSON.stringify(data), 86400);
    
    return createResponse(true, 'Token generated', {
      token: token,
      expiresIn: 86400
    });
  } catch (error) {
    return createResponse(false, error.toString(), null);
  }
}

// ============================================
// GET 핸들러
// ============================================

function handleGetSubmissions(params) {
  try {
    const sheet = getSheet(params.sheetId, params.spreadsheetId);
    if (!sheet) {
      return createResponse(false, 'Sheet not found', null);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const submissions = rows.map((row, index) => {
      const obj = { id: index + 2 }; // Row number (1-indexed, +1 for header)
      headers.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    });
    
    return createResponse(true, 'Success', submissions);
  } catch (error) {
    return createResponse(false, error.toString(), null);
  }
}

function handleGetStats(params) {
  try {
    const sheet = getSheet(params.sheetId, params.spreadsheetId);
    if (!sheet) {
      return createResponse(false, 'Sheet not found', null);
    }
    
    const totalRows = sheet.getLastRow() - 1; // Exclude header
    
    return createResponse(true, 'Success', {
      total: totalRows,
      submitted: totalRows,
      pending: 0
    });
  } catch (error) {
    return createResponse(false, error.toString(), null);
  }
}

function handleVerifyResubmit(params) {
  try {
    const cache = CacheService.getScriptCache();
    const data = cache.get('resubmit_' + params.token);
    
    if (!data) {
      return createResponse(false, 'Invalid or expired token', null);
    }
    
    return createResponse(true, 'Token valid', JSON.parse(data));
  } catch (error) {
    return createResponse(false, error.toString(), null);
  }
}

function handleGetStudents(params) {
  try {
    const sheetIdentifier = params.sheetId; 
    let sheet;
    let ss;
    
    // 1. Resolve Spreadsheet & Sheet
    if (sheetIdentifier.startsWith('http')) {
      // External Spreadsheet by URL
      try {
        ss = SpreadsheetApp.openByUrl(sheetIdentifier);
      } catch (e) {
        // Try to extract ID from URL as fallback
        const idMatch = sheetIdentifier.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (idMatch) {
            try {
                ss = SpreadsheetApp.openById(idMatch[1]);
            } catch (innerE) {
                return createResponse(false, '시트 열기 실패: 권한이 없거나 주소가 잘못되었습니다. (Error: ' + innerE.message + ')', null);
            }
        } else {
            return createResponse(false, '유효하지 않은 구글 시트 주소입니다.', null);
        }
      }
      
      // Find specific tab by GID from URL
      const gidMatch = sheetIdentifier.match(/gid=(\d+)/);
      if (gidMatch && ss) {
          const gid = parseInt(gidMatch[1]);
          const sheets = ss.getSheets();
          sheet = sheets.find(s => s.getSheetId() === gid);
      }
      if (!sheet && ss) sheet = ss.getSheets()[0];
    } else {
      // Local Tab Name or ID
      try {
          sheet = getSheet(sheetIdentifier);
          if (!sheet) {
              // Try as spreadsheet ID
              ss = SpreadsheetApp.openById(sheetIdentifier);
              sheet = ss.getSheets()[0];
          }
      } catch (e) {
          return createResponse(false, '시트를 찾을 수 없습니다: ' + sheetIdentifier, null);
      }
    }

    if (!sheet) {
        return createResponse(false, '명단 시트를 찾을 수 없습니다. (탭 이름이나 URL을 확인하세요)', null);
    }

    const allData = sheet.getDataRange().getValues();
    if (allData.length < 1) return createResponse(true, '데이터가 없는 빈 시트입니다.', []);

    // --- 2. Smart Header Detection ---
    let headerRowIdx = -1;
    let headers = [];
    const nameAliases = ['이름', '성명', '학생명', 'Name', 'StudentName'];

    // Search first 10 rows for a header row containing '이름'
    for (let r = 0; r < Math.min(10, allData.length); r++) {
        const row = allData[r].map(h => String(h).replace(/\s+/g, ''));
        if (row.some(cell => nameAliases.includes(cell))) {
            headerRowIdx = r;
            headers = row;
            break;
        }
    }

    if (headerRowIdx === -1) {
        // Fallback: use first row if nothing found but provide a clear warning
        headers = allData[0].map(h => String(h).replace(/\s+/g, ''));
        return createResponse(false, "시트에서 '이름' 컬럼을 찾을 수 없습니다. (검사된 1~10행 헤더: " + allData.slice(0,3).map(r => r.join(',').slice(0,20)).join(' | ') + "...)", null);
    }

    const findCol = (aliases) => headers.findIndex(h => aliases.includes(h));

    const nameIdx = findCol(nameAliases);
    const stdIdIdx = findCol(['학번', '학생번호', 'StudentID', 'No', 'StudentNumber', '번호', 'ID', 'StudentID', '코드', '고유번호']); 
    const gradeIdx = findCol(['학년', 'Grade']);
    const classIdx = findCol(['반', 'Class']);
    const numIdx = findCol(['번호', 'Number', 'Num']);
    
    // 3. Smart Parser
    const students = [];
    // ... parseStudentId stays same ...
    const parseStudentId = (rawId) => {
        let str = String(rawId).trim().replace(/[^0-9-]/g, '');
        if (!str) return null;
        
        // Case 1: Hyphenated (e.g. 1-1-01)
        if (str.includes('-')) {
            const parts = str.split('-').filter(p => p.length > 0);
            if (parts.length >= 3) {
                return {
                    grade: parseInt(parts[parts.length-3]),
                    class_num: parseInt(parts[parts.length-2]),
                    student_num: parseInt(parts[parts.length-1])
                };
            }
        }
        
        // Case 2: 3 digits (e.g. 115 -> 1-1-5)
        if (str.length === 3) {
             return {
                 grade: parseInt(str[0]),
                 class_num: parseInt(str[1]),
                 student_num: parseInt(str[2])
             };
        }
        // Case 3: 4 digits (1101)
        if (str.length === 4) {
             return {
                 grade: parseInt(str[0]),
                 class_num: parseInt(str[1]),
                 student_num: parseInt(str.slice(2))
             };
        } 
        // Case 4: 5 digits (10101)
        else if (str.length === 5) {
             return {
                 grade: parseInt(str[0]),
                 class_num: parseInt(str.slice(1, 3)),
                 student_num: parseInt(str.slice(3))
             };
        }
        // Case 5: 6 digits
        else if (str.length >= 6) {
             const sub = str.length === 7 ? str.slice(2) : str.slice(str.length - 4);
             return parseStudentId(sub);
        }
        return null;
    };

    const rows = allData.slice(headerRowIdx + 1);
    for (const row of rows) {
        if (!row[nameIdx]) continue;
        let student = { name: row[nameIdx] };
        
        if (gradeIdx !== -1 && classIdx !== -1 && numIdx !== -1) {
            student.grade = parseInt(row[gradeIdx]);
            student.class_num = parseInt(row[classIdx]);
            student.student_num = parseInt(row[numIdx]);
        } else if (stdIdIdx !== -1) {
            const parsed = parseStudentId(row[stdIdIdx]);
            if (parsed) {
                student = { ...student, ...parsed };
            }
        }
        
        if (student.grade && student.class_num && student.student_num) {
            students.push(student);
        }
    }

    if (students.length === 0) {
        return createResponse(false, "학생 데이터를 한 명도 파싱하지 못했습니다. '" + allData[headerRowIdx][stdIdIdx] + "' 형식을 확인해 주세요. (현재 헤더: " + headers.join(', ') + ")", null);
    }

    return createResponse(true, 'Success', students);
  } catch (error) {
    return createResponse(false, '서버 오류: ' + error.toString(), null);
  }
}

// ============================================
// 유틸리티 함수
// ============================================

function getOrCreateSheet(sheetId, spreadsheetId) {
  const ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetId);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetId);
  }
  
  return sheet;
}

function getSheet(sheetId, spreadsheetId) {
  const ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(sheetId);
}

function logAudit(action, user, data) {
  try {
    const sheet = getOrCreateSheet('_audit_log');
    
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['시간', '액션', '사용자', '데이터']);
    }
    
    sheet.appendRow([
      new Date(),
      action,
      JSON.stringify(user),
      JSON.stringify(data)
    ]);
  } catch (error) {
    Logger.log('Audit log error: ' + error.toString());
  }
}

function logEditHistory(sheetId, submissionId, oldData, newData, reason, editor) {
  try {
    const sheet = getOrCreateSheet('_edit_history');
    
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['시간', '시트ID', '제출ID', '수정자', '사유', '이전값', '새값']);
    }
    
    sheet.appendRow([
      new Date(),
      sheetId,
      submissionId,
      editor,
      reason,
      JSON.stringify(oldData),
      JSON.stringify(newData)
    ]);
  } catch (error) {
    Logger.log('Edit history error: ' + error.toString());
  }
}

function createResponse(success, message, data) {
  const response = {
    success: success,
    message: message,
    data: data,
    timestamp: new Date().toISOString()
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
