"use client"
//TODO:
// HomePage()
// handleCreateClick()
// handleJoinClick()
// import { main, deleteEvent, deleteImg, getImages } from "./api/home/route";
import Image from "next/image";
import React, { useState, ChangeEvent } from "react";
import { createEvent } from "./create-event/actions";
import { generateEmbedding } from "@/lib/embeddings";
import { signOut } from "next-auth/react";
type aplha = {
  key: string,
  url: string,
}
export default function Page() {
const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string[]>([]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);

    // Generate preview URLs
    const previewUrls = selectedFiles.map((file) =>
      URL.createObjectURL(file)
    );
    setPreview(previewUrls);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      alert("Please select files first");
      return;
    }

    const response = await generateEmbedding(files[0]); 
    // await createEvent({
    //   name: "name",
    //   description: "asasd",
    //   password: "123",
    //   images: files
    // })
    console.log(response);
  };

  const handleLogout = async() => {
    await signOut();
    // revalidatePath('/');
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Upload Multiple Images</h2>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
      />

      <br /><br />

      <button onClick={handleUpload}>
        Upload Images
      </button>

      {/* Preview */}
      <div style={{ marginTop: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {preview.map((src, index) => (
          <img
            key={index}
            src={src}
            alt="preview"
            width={100}
            height={100}
            style={{ objectFit: "cover", borderRadius: "8px" }}
          />
        ))}
      <h1 className="bg-green-400" >Hello</h1>
      </div>
      <button className="bg-blue-500" onClick={handleLogout}>Logout</button>
    </div>
  );
}
