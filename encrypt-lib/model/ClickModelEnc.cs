using System;
using System.Runtime.CompilerServices;
using System.Runtime.Serialization;
using System.Security;
using System.Security.Permissions;
using IKVM.Attributes;
using ikvm.@internal;
using java.io;
using java.lang;

namespace com.edc.classbook.model
{
	// Token: 0x02000005 RID: 5
	[Implements(new string[] { "java.io.Serializable" })]
	[Serializable]
	public class ClickModelEnc : Object, Serializable.__Interface, ISerializable
	{
		// Token: 0x06000040 RID: 64 RVA: 0x00002668 File Offset: 0x00000868
		public virtual string getClickable_type()
		{
			return this.clickable_type;
		}

		// Token: 0x06000041 RID: 65 RVA: 0x00002670 File Offset: 0x00000870
		public virtual int getPage_index()
		{
			return this.page_index;
		}

		// Token: 0x06000042 RID: 66 RVA: 0x00002678 File Offset: 0x00000878
		public virtual string getX()
		{
			return this.x;
		}

		// Token: 0x06000043 RID: 67 RVA: 0x00002680 File Offset: 0x00000880
		public virtual string getY()
		{
			return this.y;
		}

		// Token: 0x06000044 RID: 68 RVA: 0x00002688 File Offset: 0x00000888
		public virtual string getWidth()
		{
			return this.width;
		}

		// Token: 0x06000045 RID: 69 RVA: 0x00002690 File Offset: 0x00000890
		public virtual string getHeight()
		{
			return this.height;
		}

		// Token: 0x06000046 RID: 70 RVA: 0x00002698 File Offset: 0x00000898
		public virtual string getFile_path()
		{
			return this.file_path;
		}

		// Token: 0x06000047 RID: 71 RVA: 0x000026A0 File Offset: 0x000008A0
		public virtual string getActive()
		{
			return this.Active;
		}

		// Token: 0x06000048 RID: 72 RVA: 0x000026A8 File Offset: 0x000008A8
		public virtual string getTts_type()
		{
			return this.tts_type;
		}

		// Token: 0x06000049 RID: 73 RVA: 0x000026B0 File Offset: 0x000008B0
		[LineNumberTable(new byte[] { 159, 168, 136 })]
		[MethodImpl(8)]
		public ClickModelEnc()
		{
		}

		// Token: 0x0600004A RID: 74 RVA: 0x000026BC File Offset: 0x000008BC
		[LineNumberTable(new byte[]
		{
			159, 186, 104, 103, 103, 103, 104, 104, 104, 104,
			104, 104, 104
		})]
		[MethodImpl(8)]
		public ClickModelEnc(int _id, string _clickable_type, int _page_index, string _x, string _y, string _width, string _height, string _file_path, string _active, string _tts_type)
		{
			this.id = _id;
			this.clickable_type = _clickable_type;
			this.page_index = _page_index;
			this.x = _x;
			this.y = _y;
			this.width = _width;
			this.height = _height;
			this.file_path = _file_path;
			this.Active = _active;
			this.tts_type = _tts_type;
		}

		// Token: 0x0600004B RID: 75 RVA: 0x0000271E File Offset: 0x0000091E
		public virtual int getId()
		{
			return this.id;
		}

		// Token: 0x0600004C RID: 76 RVA: 0x00002726 File Offset: 0x00000926
		public virtual void setId(int id)
		{
			this.id = id;
		}

		// Token: 0x0600004D RID: 77 RVA: 0x0000272F File Offset: 0x0000092F
		public virtual void setClickable_type(string clickable_type)
		{
			this.clickable_type = clickable_type;
		}

		// Token: 0x0600004E RID: 78 RVA: 0x00002738 File Offset: 0x00000938
		public virtual void setPage_index(int page_index)
		{
			this.page_index = page_index;
		}

		// Token: 0x0600004F RID: 79 RVA: 0x00002741 File Offset: 0x00000941
		public virtual void setX(string x)
		{
			this.x = x;
		}

		// Token: 0x06000050 RID: 80 RVA: 0x0000274A File Offset: 0x0000094A
		public virtual void setY(string y)
		{
			this.y = y;
		}

		// Token: 0x06000051 RID: 81 RVA: 0x00002753 File Offset: 0x00000953
		public virtual void setWidth(string width)
		{
			this.width = width;
		}

		// Token: 0x06000052 RID: 82 RVA: 0x0000275C File Offset: 0x0000095C
		public virtual void setHeight(string height)
		{
			this.height = height;
		}

		// Token: 0x06000053 RID: 83 RVA: 0x00002765 File Offset: 0x00000965
		public virtual void setFile_path(string file_path)
		{
			this.file_path = file_path;
		}

		// Token: 0x06000054 RID: 84 RVA: 0x0000276E File Offset: 0x0000096E
		public virtual void setActive(string active)
		{
			this.Active = active;
		}

		// Token: 0x06000055 RID: 85 RVA: 0x00002777 File Offset: 0x00000977
		public virtual void setTts_type(string tts_type)
		{
			this.tts_type = tts_type;
		}

		// Token: 0x06000056 RID: 86 RVA: 0x00002780 File Offset: 0x00000980
		[HideFromJava]
		public static implicit operator Serializable(ClickModelEnc A_0)
		{
			Serializable serializable;
			serializable.__<ref> = A_0;
			return serializable;
		}

		// Token: 0x06000057 RID: 87 RVA: 0x0000279C File Offset: 0x0000099C
		[SecurityCritical]
		[HideFromJava]
		[PermissionSet(2, XML = "<PermissionSet class=\"System.Security.PermissionSet\"\r\nversion=\"1\">\r\n<IPermission class=\"System.Security.Permissions.SecurityPermission, mscorlib, Version=2.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089\"\r\nversion=\"1\"\r\nFlags=\"SerializationFormatter\"/>\r\n</PermissionSet>\r\n")]
		protected virtual void GetObjectData(SerializationInfo A_1, StreamingContext A_2)
		{
			Serialization.writeObject(this, A_1);
		}

		// Token: 0x06000058 RID: 88 RVA: 0x000027A5 File Offset: 0x000009A5
		[HideFromJava]
		[PermissionSet(2, XML = "<PermissionSet class=\"System.Security.PermissionSet\"\r\nversion=\"1\">\r\n<IPermission class=\"System.Security.Permissions.SecurityPermission, mscorlib, Version=2.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089\"\r\nversion=\"1\"\r\nFlags=\"SerializationFormatter\"/>\r\n</PermissionSet>\r\n")]
		protected ClickModelEnc(SerializationInfo A_1, StreamingContext A_2)
		{
			Serialization.readObject(this, A_1);
		}

		// Token: 0x04000019 RID: 25
		private int id;

		// Token: 0x0400001A RID: 26
		private string clickable_type;

		// Token: 0x0400001B RID: 27
		private int page_index;

		// Token: 0x0400001C RID: 28
		private string x;

		// Token: 0x0400001D RID: 29
		private string y;

		// Token: 0x0400001E RID: 30
		private string width;

		// Token: 0x0400001F RID: 31
		private string height;

		// Token: 0x04000020 RID: 32
		private string file_path;

		// Token: 0x04000021 RID: 33
		private string Active;

		// Token: 0x04000022 RID: 34
		private string tts_type;
	}
}
