// DPAPI protects the saved key for this Windows account. No secret enters exports.
#[cfg(windows)]
mod platform {
    use std::ffi::c_void;
    #[repr(C)] struct Blob { len:u32, data:*mut u8 }
    #[link(name="Crypt32")] unsafe extern "system" {
        fn CryptProtectData(input:*const Blob,description:*const u16,entropy:*const Blob,reserved:*mut c_void,prompt:*mut c_void,flags:u32,output:*mut Blob)->i32;
        fn CryptUnprotectData(input:*const Blob,description:*mut *mut u16,entropy:*const Blob,reserved:*mut c_void,prompt:*mut c_void,flags:u32,output:*mut Blob)->i32;
    }
    #[link(name="Kernel32")] unsafe extern "system" {fn LocalFree(memory:*mut c_void)->*mut c_void;}
    fn crypt(bytes:&[u8],protect:bool)->Result<Vec<u8>,String>{
        let input=Blob{len:bytes.len() as u32,data:bytes.as_ptr() as *mut u8};let mut output=Blob{len:0,data:std::ptr::null_mut()};
        let ok=unsafe{if protect{CryptProtectData(&input,std::ptr::null(),std::ptr::null(),std::ptr::null_mut(),std::ptr::null_mut(),1,&mut output)}else{CryptUnprotectData(&input,std::ptr::null_mut(),std::ptr::null(),std::ptr::null_mut(),std::ptr::null_mut(),1,&mut output)}};
        if ok==0{return Err("Windows could not access the secure API key store.".into())}
        let result=unsafe{std::slice::from_raw_parts(output.data,output.len as usize).to_vec()};unsafe{LocalFree(output.data as *mut c_void)};Ok(result)
    }
    fn registry()->Result<winreg::RegKey,String>{winreg::RegKey::predef(winreg::enums::HKEY_CURRENT_USER).create_subkey("Software\\NotePaeds\\AI").map(|x|x.0).map_err(|_|"Cannot open the Windows key store.".into())}
    pub fn save(key:&str)->Result<(),String>{let encrypted=crypt(key.as_bytes(),true)?;registry()?.set_raw_value("ApiKey",&winreg::RegValue{bytes:encrypted,vtype:winreg::enums::REG_BINARY}).map_err(|_|"Cannot save the encrypted key.".into())}
    pub fn load()->Result<Option<String>,String>{let reg=registry()?;match reg.get_raw_value("ApiKey"){Ok(v)=>{if v.bytes.is_empty(){return Ok(Some(String::new()))}String::from_utf8(crypt(&v.bytes,false)?).map(Some).map_err(|_|"The saved key is damaged. Enter it again.".into())},Err(e) if e.kind()==std::io::ErrorKind::NotFound=>Ok(None),Err(_)=>Err("Cannot read the saved key.".into())}}
    pub fn remove()->Result<(),String>{registry()?.set_raw_value("ApiKey",&winreg::RegValue{bytes:vec![],vtype:winreg::enums::REG_BINARY}).map_err(|_|"Cannot remove the saved key.".into())}
    #[cfg(test)] mod tests {#[test]fn encrypted_roundtrip(){let value=b"synthetic-test-value";let encrypted=super::crypt(value,true).unwrap();assert_ne!(&encrypted,value);assert_eq!(super::crypt(&encrypted,false).unwrap(),value);}}
}
#[cfg(windows)] pub use platform::{save,load,remove};
#[cfg(not(windows))] pub fn save(_: &str)->Result<(),String>{Err("Secure key storage requires Windows.".into())}
#[cfg(not(windows))] pub fn load()->Result<Option<String>,String>{Ok(None)}
#[cfg(not(windows))] pub fn remove()->Result<(),String>{Ok(())}
