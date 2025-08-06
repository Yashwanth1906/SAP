from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
import google.generativeai as genai
import os
from github_fetcher import GitHubFetcher
from fastapi.responses import StreamingResponse
import json
import asyncio

router = APIRouter(prefix="/chat", tags=["Chat"])


genai.configure(api_key=os.getenv("GOOGLE_API_KEY", "AIzaSyDJ93dDkl8gD7shJSvWY-fX1mvzp4bFABk"))
model = genai.GenerativeModel('gemini-2.5-pro')



session_contexts: Dict[str, Dict] = {}

class ChatMessage(BaseModel):
    message: str
    model_id: Optional[int] = None
    github_url: Optional[str] = None
    session_id: Optional[str] = None  

class ChatResponse(BaseModel):
    response: str
    github_code_analyzed: bool = False
    files_fetched: List[str] = []
    session_id: Optional[str] = None

class GitHubCodeRequest(BaseModel):
    model_id: int
    user_query: str
    session_id: Optional[str] = None

def get_session_context(session_id: str) -> Dict:
   
    if session_id not in session_contexts:
        session_contexts[session_id] = {
            'github_code': None,
            'files_fetched': [],
            'model_info': None,
            'conversation_history': []
        }
    return session_contexts[session_id]

def update_session_context(session_id: str, github_code: str = None, files_fetched: List[str] = None, model_info: Dict = None):
   
    context = get_session_context(session_id)
    if github_code is not None:
        context['github_code'] = github_code
    if files_fetched is not None:
        context['files_fetched'] = files_fetched
    if model_info is not None:
        context['model_info'] = model_info

@router.post("/send", response_model=ChatResponse)
async def send_message(chat_data: ChatMessage):
   
    try:
        session_id = chat_data.session_id or "default"
        context = get_session_context(session_id)
        
       
        github_code_content = context.get('github_code', "")
        files_fetched = context.get('files_fetched', [])
        
        if chat_data.github_url and not github_code_content:
            fetcher = GitHubFetcher()
            files_content = fetcher.fetch_repository_files(chat_data.github_url)
            
            if files_content:
                github_code_content = fetcher.format_for_llm(files_content)
                files_fetched = list(files_content.keys())
                update_session_context(session_id, github_code_content, files_fetched)
        
       
        if github_code_content:
            prompt = f"""
You are an AI assistant helping with code analysis and security assessment. 

GitHub Repository Code (from previous session):
{github_code_content}

User Query: {chat_data.message}

Please analyze the code and provide a comprehensive response addressing the user's query. Focus on:
1. Code quality and best practices
2. Security vulnerabilities
3. Performance considerations
4. Specific recommendations based on the user's question
5. Only give the code in the backtick markdown format. For filenames ,give them in the bold format.I want only the code in the backtick markdown format.
6. Only answer to User's questions concisely. Don't give any other information.

Provide detailed, actionable advice.
"""
        else:
            prompt = f"""
You are an AI assistant helping with general questions about AI models, security, and best practices.

User Query: {chat_data.message}

Please provide a helpful and informative response.
"""
        
       
        response = model.generate_content(prompt)
        
       
        context['conversation_history'].append({
            'user': chat_data.message,
            'assistant': response.text
        })
        
        return ChatResponse(
            response=response.text,
            github_code_analyzed=bool(github_code_content),
            files_fetched=files_fetched,
            session_id=session_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat message: {str(e)}")

@router.post("/analyze-model", response_model=ChatResponse)
async def analyze_model_code(request: GitHubCodeRequest):
   
    try:
        session_id = request.session_id or "default"
        context = get_session_context(session_id)
        
       
        from controllers.model_controller import get_model_by_id
        
        model_details = get_model_by_id(request.model_id)
        if not model_details or not model_details.github_url:
            raise HTTPException(status_code=404, detail="Model not found or no GitHub URL available")
        
                                                                                                            
        github_code_content = context.get('github_code')
        files_fetched = context.get('files_fetched', [])
        
        if not github_code_content:
            fetcher = GitHubFetcher()
            files_content = fetcher.fetch_repository_files(model_details.github_url)
            
            if not files_content:
                raise HTTPException(status_code=404, detail="No relevant files found in the GitHub repository")
            
            github_code_content = fetcher.format_for_llm(files_content)
            files_fetched = list(files_content.keys())
            
            update_session_context(session_id, github_code_content, files_fetched, {
                'name': model_details.name,
                'type': model_details.type,
                'description': model_details.description
            })
   
        prompt = f"""
You are an AI assistant specializing in AI model analysis and security assessment.

Model Information:
- Name: {model_details.name}
- Type: {model_details.type}
- Description: {model_details.description}

GitHub Repository Code (from session context):
{github_code_content}

User Query: {request.user_query}

Please provide a comprehensive analysis addressing the user's specific question about this model. Consider:
1. Code structure and architecture
2. Security implications
3. Performance characteristics
4. Potential vulnerabilities
5. Recommendations for improvement

Provide specific, actionable insights based on the code analysis.
"""
        
        response = model.generate_content(prompt)
        
        
        context['conversation_history'].append({
            'user': request.user_query,
            'assistant': response.text
        })
        
        return ChatResponse(
            response=response.text,
            github_code_analyzed=True,
            files_fetched=files_fetched,
            session_id=session_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing model code: {str(e)}")

@router.get("/models/{model_id}/github-url")
async def get_model_github_url(model_id: int):
   
    try:
        from controllers.model_controller import get_model_by_id
        
        model_details = get_model_by_id(model_id)
        if not model_details:
            raise HTTPException(status_code=404, detail="Model not found")
        
        return {"github_url": model_details.github_url}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting model GitHub URL: {str(e)}")

@router.post("/clear-session/{session_id}")
async def clear_session_context(session_id: str):
   
    if session_id in session_contexts:
        del session_contexts[session_id]
    return {"message": "Session context cleared"}

@router.get("/session/{session_id}/context")
async def get_session_context_endpoint(session_id: str):
   
    context = get_session_context(session_id)
    return {
        "has_github_code": context.get('github_code') is not None,
        "files_fetched": context.get('files_fetched', []),
        "model_info": context.get('model_info')
    }


@router.post("/send-stream")
async def send_message_stream(chat_data: ChatMessage):
   
    async def generate_stream():
        try:
            session_id = chat_data.session_id or "default"
            context = get_session_context(session_id)
            
           
            github_code_content = context.get('github_code', "")
            files_fetched = context.get('files_fetched', [])
            
            if chat_data.github_url and not github_code_content:
                fetcher = GitHubFetcher()
                files_content = fetcher.fetch_repository_files(chat_data.github_url)
                
                if files_content:
                    github_code_content = fetcher.format_for_llm(files_content)
                    files_fetched = list(files_content.keys())
                    update_session_context(session_id, github_code_content, files_fetched)
            
           
            if github_code_content:
                prompt = f"""
You are an AI assistant helping with code analysis and security assessment. 

GitHub Repository Code (from previous session):
{github_code_content}

User Query: {chat_data.message}

Please analyze the code and provide a comprehensive response addressing the user's query. Focus on:
1. Code quality and best practices
2. Security vulnerabilities
3. Performance considerations
4. Specific recommendations based on the user's question

Provide detailed, actionable advice.
"""
            else:
                prompt = f"""
You are an AI assistant helping with general questions about AI models, security, and best practices.

User Query: {chat_data.message}

Please provide a helpful and informative response.
"""
            
           
            response = model.generate_content(prompt, stream=True)
            
            for chunk in response:
                if chunk.text:
                    yield f"data: {json.dumps({'chunk': chunk.text})}\n\n"
                    await asyncio.sleep(0.01)  
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            error_message = f"Error: {str(e)}"
            yield f"data: {json.dumps({'chunk': error_message})}\n\n"
            yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )

@router.post("/analyze-model-stream")
async def analyze_model_code_stream(request: GitHubCodeRequest):
   
    async def generate_stream():
        try:
            session_id = request.session_id or "default"
            context = get_session_context(session_id)
            
           
            from db.connection import db_manager
            with db_manager.get_cursor() as cursor:
                cursor.execute("SELECT * FROM MODELS WHERE ID = ?", (request.model_id,))
                model_info = cursor.fetchone()
            
            if not model_info:
                yield f"data: {json.dumps({'chunk': 'Model not found.'})}\n\n"
                yield "data: [DONE]\n\n"
                return
            
           
            github_url = model_info[5]  
            if not github_url:
                yield f"data: {json.dumps({'chunk': 'No GitHub URL associated with this model.'})}\n\n"
                yield "data: [DONE]\n\n"
                return
            

            fetcher = GitHubFetcher()
            files_content = fetcher.fetch_repository_files(github_url)
            
            if not files_content:
                yield f"data: {json.dumps({'chunk': 'Could not fetch repository files.'})}\n\n"
                yield "data: [DONE]\n\n"
                return
            
           
            github_code_content = fetcher.format_for_llm(files_content)
            files_fetched = list(files_content.keys())
            update_session_context(session_id, github_code_content, files_fetched, {
                'id': model_info[0],
                'name': model_info[2],
                'type': model_info[3],
                'description': model_info[4]
            })
            
           
            prompt = f"""
You are an AI assistant analyzing a machine learning model's code repository.

Model Information:
- Name: {model_info[2]}
- Type: {model_info[3]}
- Description: {model_info[4] or 'No description available'}

GitHub Repository: {github_url}

Repository Code:
{github_code_content}

User Query: {request.user_query}

Please analyze the code and provide insights about:
1. Code structure and organization
2. Potential bias patterns or fairness issues
3. Security considerations
4. Performance optimizations
5. Specific recommendations based on the user's question

Provide detailed, actionable advice with code examples when relevant.
"""
            
           
            response = model.generate_content(prompt, stream=True)
            
            for chunk in response:
                if chunk.text:
                    yield f"data: {json.dumps({'chunk': chunk.text})}\n\n"
                    await asyncio.sleep(0.01)  
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            error_message = f"Error: {str(e)}"
            yield f"data: {json.dumps({'chunk': error_message})}\n\n"
            yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    ) 