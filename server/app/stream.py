from app import cerebras_client as cb

async def stream_model(messages, temperature=0.2, max_tokens=700):
    """
    Stream model responses using Cerebras client.
    Yield UTF-8 encoded bytes as they arrive.
    """
    try:
        # Use the existing stream_summary function from cerebras_client
        stream = cb.stream_summary(messages, max_tokens=max_tokens, temperature=temperature)
        
        # Process the streaming response
        for chunk in stream:
            piece = chunk.choices[0].delta.content or ""
            if piece:
                yield piece.encode("utf-8")
                
    except Exception as e:
        # Yield error as text
        error_msg = f"Error streaming response: {str(e)}"
        yield error_msg.encode("utf-8")
